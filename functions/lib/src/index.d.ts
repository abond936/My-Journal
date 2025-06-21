import * as functions from "firebase-functions";
export declare const scheduledAggregateCardStats: functions.CloudFunction<unknown>;
export declare const onDemandAggregateCardStats: functions.HttpsFunction & functions.Runnable<any>;
