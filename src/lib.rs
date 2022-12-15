use http_req::request;
use serde::{Deserialize, Serialize};

const SLACK_API_PREFIX: &str = "http://127.0.0.1:3001/api";

extern "C" {
    fn get_flows_user(p: *mut u8) -> i32;
    fn get_flow_id(p: *mut u8) -> i32;
    fn get_event_body_length() -> i32;
    fn get_event_body(p: *mut u8) -> i32;
    fn set_flows(p: *const u8, len: i32);
    // fn redirect_to(p: *const u8, len: i32);
}

/*
#[no_mangle]
pub unsafe fn auth() {
    let mut s = Vec::<u8>::with_capacity(100);
    let c = get_flows_user(s.as_mut_ptr());
    s.set_len(c as usize);
    let _url = format!(
        "https://05ce-34-84-78-213.jp.ngrok.io/api/{}/access",
        String::from_utf8(s).unwrap()
    );

    // redirect_to(url.as_ptr(), url.len() as i32);
}
*/

#[no_mangle]
pub unsafe fn message() {
    if let Some(event) = get_event() {
        let mut writer = Vec::new();
        request::get(
            format!("{}/event/{}", SLACK_API_PREFIX, event.channel),
            &mut writer,
        )
        .unwrap();

        /*
        println!("Status: {} {}", res.status_code(), res.reason());
        println!("Headers {}", res.headers());
        println!("{}", String::from_utf8_lossy(&writer));
        */

        if let Ok(flows) = String::from_utf8(writer) {
            set_flows(flows.as_ptr(), flows.len() as i32);
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SlackMessage {
    #[serde(rename = "type")]
    pub event_type: String,
    pub channel: String,
    pub user: String,
    pub text: String,
    pub channel_type: String,
    pub bot_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Event {
    pub event: SlackMessage,
}

pub fn message_from_channel(team_name: &str, channel_name: &str) -> Option<SlackMessage> {
    unsafe {
        let mut flows_user = Vec::<u8>::with_capacity(100);
        let c = get_flows_user(flows_user.as_mut_ptr());
        flows_user.set_len(c as usize);
        let flows_user = String::from_utf8(flows_user).unwrap();

        let mut flow_id = Vec::<u8>::with_capacity(100);
        let c = get_flow_id(flow_id.as_mut_ptr());
        flow_id.set_len(c as usize);
        let flow_id = String::from_utf8(flow_id).unwrap();

        let mut writer = Vec::new();
        request::get(
            format!(
                "{}/{}/listen/{}?team={}&channel={}",
                SLACK_API_PREFIX, flows_user, flow_id, team_name, channel_name
            ),
            &mut writer,
        )
        .unwrap();

        serde_json::from_slice::<SlackMessage>(&writer).ok()
    }
}

pub fn send_message_to_channel(team_name: &str, channel_name: &str, text: String) {
    unsafe {
        let mut flows_user = Vec::<u8>::with_capacity(100);
        let c = get_flows_user(flows_user.as_mut_ptr());
        flows_user.set_len(c as usize);
        let flows_user = String::from_utf8(flows_user).unwrap();

        let mut writer = Vec::new();
        request::post(
            format!(
                "{}/{}/send?team={}&channel={}",
                SLACK_API_PREFIX, flows_user, team_name, channel_name
            ),
            text.as_bytes(),
            &mut writer,
        )
        .unwrap();
    }
}

pub fn get_event() -> Option<SlackMessage> {
    unsafe {
        let l = get_event_body_length();
        let mut event_body = Vec::<u8>::with_capacity(l as usize);
        let c = get_event_body(event_body.as_mut_ptr());
        assert!(c == l);
        event_body.set_len(c as usize);
        match serde_json::from_slice::<Event>(&event_body) {
            Ok(e) => match e.event.bot_id {
                Some(_) => None,
                None => Some(e.event),
            },
            Err(_) => None,
        }
    }
}
