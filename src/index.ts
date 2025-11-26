import * as core from '@actions/core';
import { PubSub } from '@google-cloud/pubsub';
import {
  createSubscription,
  SubscriptionConfig
} from './pubsub';

async function run(): Promise<void> {
  try {
    // Get inputs
    const projectId = core.getInput('project-id', { required: true });
    const subscriptionName = core.getInput('subscription-name', { required: true });
    const topicName = core.getInput('topic-name', { required: true });
    const skipIfExistsStr = core.getInput('skip-if-exists') || 'false';
    const ackDeadlineSecondsStr = core.getInput('ack-deadline-seconds') || undefined;
    const pushEndpoint = core.getInput('push-endpoint') || undefined;
    const filter = core.getInput('filter') || undefined;
    const labels = core.getInput('labels') || undefined;
    const retainAckedMessagesStr = core.getInput('retain-acked-messages') || 'false';
    const messageRetentionDuration = core.getInput('message-retention-duration') || undefined;

    core.info('GCP Pub/Sub Create Subscription');
    core.info(`Project ID: ${projectId}`);
    core.info(`Subscription: ${subscriptionName}`);
    core.info(`Topic: ${topicName}`);

    // Parse boolean values
    const skipIfExists = skipIfExistsStr.toLowerCase() === 'true';
    const retainAckedMessages = retainAckedMessagesStr.toLowerCase() === 'true';

    // Parse ack deadline seconds
    let ackDeadlineSeconds: number | undefined = undefined;
    if (ackDeadlineSecondsStr) {
      ackDeadlineSeconds = parseInt(ackDeadlineSecondsStr, 10);
      if (isNaN(ackDeadlineSeconds)) {
        throw new Error(`Invalid ack-deadline-seconds: "${ackDeadlineSecondsStr}". Must be a number.`);
      }
    }

    // Create Pub/Sub client
    const pubsub = new PubSub({ projectId });

    // Build configuration
    const config: SubscriptionConfig = {
      subscriptionName,
      topicName,
      skipIfExists,
      ackDeadlineSeconds,
      pushEndpoint,
      filter,
      labels,
      retainAckedMessages,
      messageRetentionDuration
    };

    // Create subscription
    const result = await createSubscription(pubsub, config);

    // Handle result
    if (!result.success) {
      throw new Error(result.error || 'Failed to create subscription');
    }

    // Set outputs
    if (result.subscriptionName) {
      core.setOutput('subscription-name', result.subscriptionName);
    }

    if (result.created !== undefined) {
      core.setOutput('created', String(result.created));
    }

    // Summary
    core.info('');
    core.info('='.repeat(50));
    if (result.created) {
      core.info('Subscription created successfully');
    } else {
      core.info('Subscription already exists (skip-if-exists enabled)');
    }
    if (result.subscriptionName) {
      core.info(`Subscription: ${result.subscriptionName}`);
    }
    core.info('='.repeat(50));

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(errorMessage);
  }
}

run();
