import { PubSub, Subscription } from '@google-cloud/pubsub';
import * as core from '@actions/core';

export interface SubscriptionConfig {
  subscriptionName: string;
  topicName: string;
  skipIfExists: boolean;
  ackDeadlineSeconds?: number;
  pushEndpoint?: string;
  filter?: string;
  labels?: string; // JSON string
  retainAckedMessages?: boolean;
  messageRetentionDuration?: string;
}

export interface SubscriptionResult {
  success: boolean;
  subscriptionName?: string;
  created?: boolean;
  error?: string;
}

/**
 * Parse labels from JSON string
 */
export function parseLabels(labelsJson: string): Record<string, string> {
  try {
    const parsed = JSON.parse(labelsJson);
    
    // Validate that all values are strings
    const labels: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value !== 'string') {
        throw new Error(
          `Label "${key}" must be a string, got ${typeof value}. ` +
          'All labels must be strings.'
        );
      }
      labels[key] = value;
    }
    
    return labels;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse labels: ${errorMessage}`);
  }
}

/**
 * Validate subscription name format
 */
export function validateSubscriptionName(subscriptionName: string): void {
  // Subscription names must:
  // - Start with a letter
  // - Contain only letters, numbers, dashes, underscores, periods, tildes, plus, and percent signs
  // - Be between 3 and 255 characters
  const subscriptionPattern = /^[a-zA-Z][a-zA-Z0-9._~+%-]{2,254}$/;
  
  if (!subscriptionPattern.test(subscriptionName)) {
    throw new Error(
      `Invalid subscription name: "${subscriptionName}". ` +
      'Subscription names must start with a letter and be 3-255 characters long, ' +
      'containing only letters, numbers, and ._~+%-'
    );
  }
}

/**
 * Validate topic name format
 */
export function validateTopicName(topicName: string): void {
  const topicPattern = /^[a-zA-Z][a-zA-Z0-9._~+%-]{2,254}$/;
  
  if (!topicPattern.test(topicName)) {
    throw new Error(
      `Invalid topic name: "${topicName}". ` +
      'Topic names must start with a letter and be 3-255 characters long, ' +
      'containing only letters, numbers, and ._~+%-'
    );
  }
}

/**
 * Validate ack deadline seconds
 */
export function validateAckDeadline(ackDeadlineSeconds: number): void {
  if (ackDeadlineSeconds < 10 || ackDeadlineSeconds > 600) {
    throw new Error(
      `Invalid ack-deadline-seconds: ${ackDeadlineSeconds}. ` +
      'Must be between 10 and 600 seconds.'
    );
  }
}

/**
 * Check if subscription exists
 */
export async function checkSubscriptionExists(
  pubsub: PubSub,
  subscriptionName: string
): Promise<{ exists: boolean; subscription?: Subscription }> {
  try {
    const subscription = pubsub.subscription(subscriptionName);
    const [exists] = await subscription.exists();
    return { exists, subscription: exists ? subscription : undefined };
  } catch (error) {
    core.warning(`Failed to check if subscription exists: ${error instanceof Error ? error.message : String(error)}`);
    return { exists: false };
  }
}

/**
 * Parse duration string to object format
 */
export function parseDuration(duration: string): { seconds?: number; nanos?: number } {
  // Parse formats like "7d", "600s", "1h"
  const match = duration.match(/^(\d+)([dhms])$/);
  if (!match) {
    throw new Error(
      `Invalid duration format: "${duration}". ` +
      'Use format like "7d" (days), "600s" (seconds), "1h" (hours), or "30m" (minutes)'
    );
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  let seconds = 0;
  switch (unit) {
    case 'd':
      seconds = value * 86400;
      break;
    case 'h':
      seconds = value * 3600;
      break;
    case 'm':
      seconds = value * 60;
      break;
    case 's':
      seconds = value;
      break;
  }

  return { seconds };
}

/**
 * Create a Pub/Sub subscription
 */
export async function createSubscription(
  pubsub: PubSub,
  config: SubscriptionConfig
): Promise<SubscriptionResult> {
  try {
    // Validate inputs
    validateSubscriptionName(config.subscriptionName);
    validateTopicName(config.topicName);

    if (config.ackDeadlineSeconds !== undefined) {
      validateAckDeadline(config.ackDeadlineSeconds);
    }

    core.info(`Subscription name: ${config.subscriptionName}`);
    core.info(`Topic: ${config.topicName}`);

    // Check if subscription already exists
    const existsCheck = await checkSubscriptionExists(pubsub, config.subscriptionName);

    if (existsCheck.exists && existsCheck.subscription) {
      if (config.skipIfExists) {
        const fullName = existsCheck.subscription.name;
        core.info(`✓ Subscription already exists: ${fullName}`);
        core.info('Skip-if-exists is enabled, treating as success');

        return {
          success: true,
          subscriptionName: fullName,
          created: false
        };
      } else {
        throw new Error(
          `Subscription "${config.subscriptionName}" already exists. ` +
          'Set skip-if-exists=true to succeed when subscription exists.'
        );
      }
    }

    core.info('Creating new subscription...');

    // Build subscription options
    const options: {
      ackDeadlineSeconds?: number;
      pushEndpoint?: string;
      filter?: string;
      labels?: Record<string, string>;
      retainAckedMessages?: boolean;
      messageRetentionDuration?: { seconds?: number; nanos?: number };
    } = {};

    // Add ack deadline if provided
    if (config.ackDeadlineSeconds !== undefined) {
      options.ackDeadlineSeconds = config.ackDeadlineSeconds;
      core.info(`ACK deadline: ${config.ackDeadlineSeconds} seconds`);
    }

    // Add push endpoint if provided
    if (config.pushEndpoint) {
      options.pushEndpoint = config.pushEndpoint;
      core.info(`Push endpoint: ${config.pushEndpoint}`);
    }

    // Add filter if provided
    if (config.filter) {
      options.filter = config.filter;
      core.info(`Filter: ${config.filter}`);
    }

    // Add labels if provided
    if (config.labels) {
      options.labels = parseLabels(config.labels);
      core.info(`Labels: ${Object.keys(options.labels).length} label(s)`);
    }

    // Add retain acked messages if provided
    if (config.retainAckedMessages !== undefined) {
      options.retainAckedMessages = config.retainAckedMessages;
      core.info(`Retain acked messages: ${config.retainAckedMessages}`);
    }

    // Add message retention duration if provided
    if (config.messageRetentionDuration) {
      options.messageRetentionDuration = parseDuration(config.messageRetentionDuration);
      core.info(`Message retention: ${config.messageRetentionDuration}`);
    }

    // Get topic reference
    const topic = pubsub.topic(config.topicName);

    // Create subscription
    const [subscription] = await topic.createSubscription(config.subscriptionName, options);

    core.info('✓ Subscription created successfully');
    core.info(`Subscription name: ${subscription.name}`);

    return {
      success: true,
      subscriptionName: subscription.name,
      created: true
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.error(`Failed to create subscription: ${errorMessage}`);
    return {
      success: false,
      error: errorMessage
    };
  }
}
