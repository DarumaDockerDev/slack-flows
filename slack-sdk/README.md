This is a library for integrating Slack in your flow function for [test.flows.network](https://test.flows.network).

## Example usage
```rust
use slack_flows::{
    listen_to_channel, message_from_channel, revoke_listeners, send_message_to_channel,
};

#[no_mangle]
pub fn register() {
    revoke_listeners();
    listen_to_channel("myworkspace", "mychannel") {
}

#[no_mangle]
pub fn work() {
    if let Some(sm) = message_from_channel() {
        send_message_to_channel("myworkspace", "mychannel", format!("Hello, {}", sm.text));
    }
}
```

In `register()` the [`listen_to_channel`](https://docs.rs/slack-flows/latest/slack_flows/fn.listen_to_channel.html) will create a listener for new message from channel `mychannel` in workspace `myworkspace`.

When a new message is sent to `mychannel`, the `work()` will be called. We get the [`SlackMessage`](https://docs.rs/slack-flows/latest/slack_flows/struct.SlackMessage.html) using [`message_from_channel`](https://docs.rs/slack-flows/latest/slack_flows/fn.message_from_channel.html) then [`send_message_to_channel`](https://docs.rs/slack-flows/latest/slack_flows/fn.send_message_to_channel.html).

The whole document is [here](https://docs.rs/slack-flows).
