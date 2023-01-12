use http_req::request;
use slack_flows::Event;

const SLACK_API_PREFIX: &str = "http://127.0.0.1:3001/api";

extern "C" {
    fn get_event_body_length() -> i32;
    fn get_event_body(p: *mut u8) -> i32;
    fn set_flows(p: *const u8, len: i32);
}

#[no_mangle]
pub unsafe fn message() {
    if let Some(e) = message_from_channel() {
        let mut writer = Vec::new();
        let res = request::get(
            format!(
                "{}/event/{}?team={}&user={}",
                SLACK_API_PREFIX, e.event.channel, e.team_id, e.event.user
            ),
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

fn message_from_channel() -> Option<Event> {
    unsafe {
        let l = get_event_body_length();
        let mut event_body = Vec::<u8>::with_capacity(l as usize);
        let c = get_event_body(event_body.as_mut_ptr());
        assert!(c == l);
        event_body.set_len(c as usize);
        match serde_json::from_slice::<Event>(&event_body) {
            Ok(e) => Some(e),
            Err(_) => None,
        }
    }
}
