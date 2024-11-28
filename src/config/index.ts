import { SQSClient } from '@aws-sdk/client-sqs'
export const SQS_CONFIG = {
  region: 'ap-southeast-2',
  credentials: {
    accessKeyId: 'AKIAW5BDQ342P5X2R6GQ',
    secretAccessKey: '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'
  }
}

export const SQS_CLIENT = new SQSClient(SQS_CONFIG)
       

export const QUEUE_URL = 'https://sqs.ap-southeast-2.amazonaws.com/474668392244/Victoriaxaoquyet'

export const SERVER_ENPOINT = 'https://payment-api-8clk.vercel.app/'