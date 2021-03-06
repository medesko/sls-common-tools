import * as awsXray from 'aws-xray-sdk';
import * as AWS from 'aws-sdk';
import { log } from './log.utilities';

const SQS = awsXray.captureAWSClient(new AWS.SQS({ endpoint: process.env.SQS_ENDPOINT_URL }));

const queueName: string = process.env.QUEUE_NAME || `${process.env.SATGE}-default-queue`;
if (!queueName) {
  throw new Error('QUEUE_NAME must be set');
} else {
  log.info({ queueName }, 'Using queue');
}

let queueUrlPromise;

export const enqueue = async <T>(message: T) => {
  const params = {
    MessageBody: JSON.stringify(message),
    QueueUrl: await fetchQueueUrl(),
  };

  const result = await SQS.sendMessage(params).promise();
  log.debug({ result }, 'Sent SQS Message');
};

export const dequeue = async params => {
  const result = await SQS.receiveMessage({
    QueueUrl: await fetchQueueUrl(),
    ...params,
  }).promise();

  log.debug({ result }, 'SQS queue from which messages are received');
  return result;
};

export const deleteQueueMessage = async receiptHandle => {
  const result = await SQS.deleteMessage({
    QueueUrl: await fetchQueueUrl(),
    ReceiptHandle: receiptHandle,
  }).promise();
  log.debug({ result }, 'SQS queue from Receipt handle are deleted');
};

const fetchQueueUrl = () => {
  if (queueUrlPromise) {
    return queueUrlPromise;
  }

  queueUrlPromise = SQS.getQueueUrl({
    QueueName: queueName,
  })
    .promise()
    .then((result: AWS.SQS.GetQueueUrlResult) => {
      const queueUrl = result.QueueUrl;
      log.info({ queueUrl }, 'Using queue URL');
      return queueUrl;
    })
    .catch(err => {
      log.error({ err }, 'Failed to read queue URL');
      queueUrlPromise = null;
      throw err;
    });
  return queueUrlPromise;
};
