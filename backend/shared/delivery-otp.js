"use strict";
const c=require("./core");
const {SESClient,SendEmailCommand}=require("@aws-sdk/client-ses");
const ses=new SESClient({maxAttempts:1});
async function handle(event) {
  const user=await c.authorize(event,"SubmitWaterRequest"),b=c.body(event),id=c.text(b.id,"simulation ID",80);
  const item=await c.get("SIM_DELIVERY",id);
  c.check(item && item.ownerId===user.sub,"Simulation not found",404);
  const now=Date.now(),key=c.key("SIM_DELIVERY",id);
  if(event.rawPath.endsWith("/send")) {
    const sender=process.env.OTP_FROM_EMAIL;
    c.check(sender,"Delivery OTP email awaits a verified AWS email sender",503);
    const claims=event.requestContext.authorizer.jwt.claims;
    c.check(String(claims.email_verified)==="true" && typeof claims.email==="string", "Use an email-verified resident account",403);
    c.check(item.status!=="CONFIRMED","This simulated delivery is already confirmed",409);
    await c.rateLimit(user.sub,"delivery-otp",60000);
    await c.rateLimit("network","otp-email",1100);
    const code=c.crypto.randomInt(100000,1000000).toString(),hash=c.hash(id+":"+code),expiresAt=now+600000;
    try {
      await c.db.send(new c.UpdateCommand({TableName:c.env("TABLE_NAME"),Key:key,
        UpdateExpression:"SET otpHash=:hash, otpExpiresAt=:expires, otpAttempts=:zero, otpIssuedAt=:now, otpState=:pending",
        ConditionExpression:"#s <> :confirmed AND (attribute_not_exists(otpIssuedAt) OR otpIssuedAt <= :cooldown)",ExpressionAttributeNames:{"#s":"status"},
        ExpressionAttributeValues:{":hash":hash,":expires":expiresAt,":zero":0,":now":now,":pending":"PENDING",":confirmed":"CONFIRMED",":cooldown":now-60000}}));
    } catch(e){if(e.name==="ConditionalCheckFailedException")throw new c.HttpError(409,"The confirmation changed. Wait one minute and retry.");throw e;}
    try {
      await ses.send(new SendEmailCommand({Source:sender,Destination:{ToAddresses:[claims.email]},Message:{
        Subject:{Data:"JAL-SETU simulated delivery confirmation code",Charset:"UTF-8"},
        Body:{Text:{Data:`Your confirmation code is ${code}. It expires in 10 minutes.\n\nSimulation reference: ${id}\nThis confirms a SIMULATED delivery only. No actual water delivery or litres are recorded.\nIf you did not request this code, ignore this email.`,Charset:"UTF-8"}}}}));
      await c.db.send(new c.UpdateCommand({TableName:c.env("TABLE_NAME"),Key:key,UpdateExpression:"SET otpState=:sent",ConditionExpression:"otpHash=:hash",ExpressionAttributeValues:{":sent":"SENT",":hash":hash}}));
    } catch(e) {
      await c.db.send(new c.UpdateCommand({TableName:c.env("TABLE_NAME"),Key:key,UpdateExpression:"SET otpState=:failed REMOVE otpHash",ConditionExpression:"otpHash=:hash",ExpressionAttributeValues:{":failed":"FAILED",":hash":hash}}));
      throw new c.HttpError(503,"The confirmation email could not be sent. Check the verified sender and AWS email recipient restrictions, then retry after one minute.");
    }
    const [local,domain]=claims.email.split("@");
    return {sent:true,destination:`${local[0]}***@${domain}`,expiresAt,simulatedDelivery:true};
  }
  if(event.rawPath.endsWith("/verify")) {
    if(item.status==="CONFIRMED")return {confirmed:true,alreadyConfirmed:true,simulatedDelivery:true,verifiedLiters:0};
    const code=c.text(b.code,"confirmation code",6);c.check(/^\d{6}$/.test(code),"Enter the six-digit email code");
    c.check(item.otpState==="SENT" && item.otpHash && item.otpExpiresAt>now && item.otpAttempts<5,"Code expired, unavailable or attempt limit reached. Request a new email.",409);
    const matches=c.crypto.timingSafeEqual(Buffer.from(c.hash(id+":"+code)),Buffer.from(item.otpHash));
    try {
      await c.db.send(new c.UpdateCommand({TableName:c.env("TABLE_NAME"),Key:key,
        UpdateExpression:matches?"SET #s=:confirmed, confirmedAt=:at, otpState=:used REMOVE otpHash":"SET otpAttempts=otpAttempts+:one",
        ConditionExpression:"otpHash=:hash AND otpState=:sent AND otpExpiresAt>:now AND otpAttempts<:max AND #s<>:confirmed",
        ExpressionAttributeNames:{"#s":"status"},ExpressionAttributeValues:{":hash":item.otpHash,":sent":"SENT",":now":now,":max":5,":confirmed":"CONFIRMED",...(matches?{":at":new Date().toISOString(),":used":"USED"}:{":one":1})}}));
    } catch(e){if(e.name==="ConditionalCheckFailedException")throw new c.HttpError(409,"Code changed or was already used. Reload the simulation.");throw e;}
    c.check(matches,"Incorrect code. Please check your email.",400);
    return {confirmed:true,simulatedDelivery:true,verifiedLiters:0};
  }
  throw new c.HttpError(404,"OTP endpoint not found");
}
module.exports={handle};
