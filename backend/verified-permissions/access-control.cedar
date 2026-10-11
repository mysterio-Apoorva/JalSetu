permit(principal in JalSetu::Role::"Dispatcher", action in [JalSetu::Action::"ReadOperations",JalSetu::Action::"RunVrpOptimizer",JalSetu::Action::"QueryCopilot"], resource);

permit(principal in JalSetu::Role::"Citizen", action in [JalSetu::Action::"ReadOperations",JalSetu::Action::"SubmitWaterRequest",JalSetu::Action::"SubmitQualityFeedback"], resource);

permit(principal in JalSetu::Role::"Driver", action in [JalSetu::Action::"ReadOperations",JalSetu::Action::"TransmitGpsTelemetry",JalSetu::Action::"SubmitProofOfDelivery"], resource);

permit(principal in JalSetu::Role::"Auditor", action in [JalSetu::Action::"ReadOperations"], resource);
