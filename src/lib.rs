use http_req::{
    request::{self, Method, Request},
    uri::Uri,
};
use serde::{Deserialize, Serialize};
use std::io::{self, Write};

const SLACK_API_PREFIX: &str = "http://127.0.0.1:3001/api";
const BOUNDARY: &'static str = "------------------------186107681282571523085017";

extern "C" {
    fn get_flows_user(p: *mut u8) -> i32;
    fn get_flow_id(p: *mut u8) -> i32;
    fn get_event_body_length() -> i32;
    fn get_event_body(p: *mut u8) -> i32;
    fn set_flows(p: *const u8, len: i32);
    fn set_error_log(p: *const u8, len: i32);
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
    if let Some(event) = message_from_channel() {
        let mut writer = Vec::new();
        let res = request::get(
            format!("{}/event/{}", SLACK_API_PREFIX, event.channel),
            &mut writer,
        )
        .unwrap();

        /*
        println!("Status: {} {}", res.status_code(), res.reason());
        println!("Headers {}", res.headers());
        println!("{}", String::from_utf8_lossy(&writer));
        */

        if res.status_code().is_success() {
            if let Ok(flows) = String::from_utf8(writer) {
                set_flows(flows.as_ptr(), flows.len() as i32);
            }
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

pub fn revoke_listeners() {
    unsafe {
        let mut flows_user = Vec::<u8>::with_capacity(100);
        let c = get_flows_user(flows_user.as_mut_ptr());
        flows_user.set_len(c as usize);
        let flows_user = String::from_utf8(flows_user).unwrap();

        let mut flow_id = Vec::<u8>::with_capacity(100);
        let c = get_flow_id(flow_id.as_mut_ptr());
        if c == 0 {
            panic!("Failed to get flow id");
        }
        flow_id.set_len(c as usize);
        let flow_id = String::from_utf8(flow_id).unwrap();

        let mut writer = Vec::new();
        let res = request::get(
            format!("{}/{}/{}/revoke", SLACK_API_PREFIX, flows_user, flow_id),
            &mut writer,
        )
        .unwrap();

        match res.status_code().is_success() {
            true => (),
            false => {
                set_error_log(writer.as_ptr(), writer.len() as i32);
            }
        }
    }
}

pub fn listen_to_channel(team_name: &str, channel_name: &str) -> Option<SlackMessage> {
    unsafe {
        let mut flows_user = Vec::<u8>::with_capacity(100);
        let c = get_flows_user(flows_user.as_mut_ptr());
        flows_user.set_len(c as usize);
        let flows_user = String::from_utf8(flows_user).unwrap();

        let mut flow_id = Vec::<u8>::with_capacity(100);
        let c = get_flow_id(flow_id.as_mut_ptr());
        if c == 0 {
            panic!("Failed to get flow id");
        }
        flow_id.set_len(c as usize);
        let flow_id = String::from_utf8(flow_id).unwrap();

        let mut writer = Vec::new();
        let res = request::get(
            format!(
                "{}/{}/{}/listen?team={}&channel={}",
                SLACK_API_PREFIX, flows_user, flow_id, team_name, channel_name
            ),
            &mut writer,
        )
        .unwrap();

        match res.status_code().is_success() {
            true => serde_json::from_slice::<SlackMessage>(&writer).ok(),
            false => {
                set_error_log(writer.as_ptr(), writer.len() as i32);
                None
            }
        }
    }
}

pub fn send_message_to_channel(team_name: &str, channel_name: &str, text: String) {
    unsafe {
        let mut flows_user = Vec::<u8>::with_capacity(100);
        let c = get_flows_user(flows_user.as_mut_ptr());
        flows_user.set_len(c as usize);
        let flows_user = String::from_utf8(flows_user).unwrap();

        let mut writer = Vec::new();
        if let Ok(res) = request::post(
            format!(
                "{}/{}/send?team={}&channel={}",
                SLACK_API_PREFIX, flows_user, team_name, channel_name
            ),
            text.as_bytes(),
            &mut writer,
        ) {
            if !res.status_code().is_success() {
                set_error_log(writer.as_ptr(), writer.len() as i32);
            }
        }
    }
}

pub fn message_from_channel() -> Option<SlackMessage> {
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

pub fn upload_file(
    team_name: &str,
    channel_name: &str,
    file_name: &str,
    mime_type: &str,
    file_bytes: Vec<u8>,
) {
    unsafe {
        let mut flows_user = Vec::<u8>::with_capacity(100);
        let c = get_flows_user(flows_user.as_mut_ptr());
        flows_user.set_len(c as usize);
        let flows_user = String::from_utf8(flows_user).unwrap();

        if let Ok(file_part) = compose_file_part(channel_name, file_name, mime_type, file_bytes) {
            let mut writer = Vec::new();

            let uri = format!(
                "{}/{}/upload?team={}&channel={}",
                SLACK_API_PREFIX, flows_user, team_name, channel_name
            );
            let uri = Uri::try_from(uri.as_str()).unwrap();
            if let Ok(res) = Request::new(&uri)
                .method(Method::POST)
                .header(
                    "Content-Type",
                    &format!("multipart/form-data; boundary={}", BOUNDARY),
                )
                .header("Content-Length", &file_part.len())
                .body(&file_part)
                .send(&mut writer)
            {
                if !res.status_code().is_success() {
                    set_error_log(writer.as_ptr(), writer.len() as i32);
                }
            }
        }
    }
}

fn compose_file_part(
    channel: &str,
    file_name: &str,
    mime_type: &str,
    file_bytes: Vec<u8>,
) -> io::Result<Vec<u8>> {
    let mut data = Vec::new();
    write!(data, "--{}\r\n", BOUNDARY)?;
    write!(data, "Content-Disposition: form-data; name=\"channel\"\r\n")?;
    write!(data, "\r\n{}\r\n", channel)?;
    write!(data, "--{}\r\n", BOUNDARY)?;
    write!(
        data,
        "Content-Disposition: form-data; name=\"file\"; filename=\"{}\"\r\n",
        file_name
    )?;
    write!(data, "Content-Type: {}\r\n\r\n", mime_type)?;

    data.extend_from_slice(&file_bytes);

    write!(data, "\r\n")?; // The key thing you are missing
    write!(data, "--{}--\r\n", BOUNDARY)?;

    Ok(data)
}
