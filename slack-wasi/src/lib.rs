use http_req::request;
use slack_flows::message_from_channel;

const SLACK_API_PREFIX: &str = "http://127.0.0.1:3001/api";

extern "C" {
    fn set_flows(p: *const u8, len: i32);
}

#[no_mangle]
pub unsafe fn message() {
    if let Some(event) = message_from_channel() {
        let mut writer = Vec::new();
        let res = request::get(
            format!("{}/event/{}", SLACK_API_PREFIX, event.channel),
            &mut writer,
        )
        .unwrap();

        if res.status_code().is_success() {
            if let Ok(flows) = String::from_utf8(writer) {
                set_flows(flows.as_ptr(), flows.len() as i32);
            }
        }
    }
}
