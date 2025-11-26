# GCP Pub/Sub Create Subscription Action

Create Google Cloud Pub/Sub subscriptions with support for pull and push delivery, message filtering, and advanced configuration options.

## Features

- ✅ Create pull or push subscriptions
- ✅ Skip gracefully if subscription already exists
- ✅ Configure acknowledgment deadlines
- ✅ Add message filters
- ✅ Set labels for organization
- ✅ Configure message retention
- ✅ Full validation and error handling

## Usage

### Basic Pull Subscription

```yaml
- name: Create Pull Subscription
  uses: predictr-io/gcp-pubsub-create-subscription@v1
  with:
    project-id: 'my-gcp-project'
    subscription-name: 'events-subscription'
    topic-name: 'events-topic'
```

### Push Subscription

```yaml
- name: Create Push Subscription
  uses: predictr-io/gcp-pubsub-create-subscription@v1
  with:
    project-id: 'my-gcp-project'
    subscription-name: 'events-push-subscription'
    topic-name: 'events-topic'
    push-endpoint: 'https://myapp.example.com/push-handler'
```

### Complete Example with Filtering

```yaml
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v2
  with:
    credentials_json: ${{ secrets.GCP_CREDENTIALS }}

- name: Create Subscription with Filter
  uses: predictr-io/gcp-pubsub-create-subscription@v1
  with:
    project-id: 'my-gcp-project'
    subscription-name: 'important-events-subscription'
    topic-name: 'events-topic'
    skip-if-exists: 'true'
    ack-deadline-seconds: '60'
    filter: 'attributes.priority="high"'
    labels: '{"env": "production", "team": "backend"}'
    retain-acked-messages: 'true'
    message-retention-duration: '7d'
```

### With Output Usage

```yaml
- name: Create Subscription
  id: create-sub
  uses: predictr-io/gcp-pubsub-create-subscription@v1
  with:
    project-id: 'my-gcp-project'
    subscription-name: 'events-subscription'
    topic-name: 'events-topic'

- name: Use Subscription Name
  run: |
    echo "Subscription: ${{ steps.create-sub.outputs.subscription-name }}"
    echo "Created: ${{ steps.create-sub.outputs.created }}"
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `project-id` | GCP project ID | Yes | - |
| `subscription-name` | Pub/Sub subscription name | Yes | - |
| `topic-name` | Pub/Sub topic name to subscribe to | Yes | - |
| `skip-if-exists` | Skip with success if subscription exists | No | `false` |
| `ack-deadline-seconds` | Acknowledgment deadline in seconds (10-600) | No | `10` |
| `push-endpoint` | Push endpoint URL (for push subscriptions) | No | - |
| `filter` | Message filter expression | No | - |
| `labels` | Subscription labels as JSON object | No | - |
| `retain-acked-messages` | Retain acknowledged messages | No | `false` |
| `message-retention-duration` | Message retention duration (e.g., "7d") | No | - |

## Outputs

| Output | Description |
|--------|-------------|
| `subscription-name` | Full subscription name (projects/{project}/subscriptions/{subscription}) |
| `created` | Whether the subscription was newly created (`true`) or already existed (`false`) |

## Authentication

This action requires GCP authentication. Use the `google-github-actions/auth` action:

```yaml
- uses: google-github-actions/auth@v2
  with:
    credentials_json: ${{ secrets.GCP_CREDENTIALS }}
```

## Required GCP Permissions

The service account needs:
- `pubsub.subscriptions.create`
- `pubsub.subscriptions.get`

Or the role: `roles/pubsub.editor`

## Examples

### Idempotent Subscription Creation

```yaml
- name: Create Subscription (Idempotent)
  uses: predictr-io/gcp-pubsub-create-subscription@v1
  with:
    project-id: 'my-gcp-project'
    subscription-name: 'events-subscription'
    topic-name: 'events-topic'
    skip-if-exists: 'true'
```

### Subscription with Custom ACK Deadline

```yaml
- name: Create Subscription with Long ACK Deadline
  uses: predictr-io/gcp-pubsub-create-subscription@v1
  with:
    project-id: 'my-gcp-project'
    subscription-name: 'slow-processing-subscription'
    topic-name: 'events-topic'
    ack-deadline-seconds: '300'
```

### Filtered Subscription

```yaml
- name: Create Filtered Subscription
  uses: predictr-io/gcp-pubsub-create-subscription@v1
  with:
    project-id: 'my-gcp-project'
    subscription-name: 'error-events-subscription'
    topic-name: 'events-topic'
    filter: 'attributes.type="error"'
```

## Message Filtering

Use the `filter` input to create subscriptions that only receive messages matching specific criteria:

```yaml
# Filter by attribute
filter: 'attributes.priority="high"'

# Multiple conditions
filter: 'attributes.env="prod" AND attributes.type="error"'

# Numeric comparisons
filter: 'attributes.size > "1000"'
```

## License

MIT
