"""Shared Meta Graph API helpers for the Gazette publishers."""
import json
import urllib.error
import urllib.parse
import urllib.request

GRAPH = "https://graph.facebook.com/v26.0"


def request_json(request):
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        try:
            payload = json.loads(error.read().decode("utf-8", errors="replace"))
            detail = payload.get("error", {}).get("message", "")
            code = payload.get("error", {}).get("code")
        except (ValueError, AttributeError):
            detail, code = "", None
        suffix = f" (Meta error {code})" if code is not None else ""
        # Do not include request URLs; Graph API URLs can contain credentials.
        raise RuntimeError(f"Meta Graph API returned HTTP {error.code}{suffix}: {detail or 'request failed'}") from None
    except urllib.error.URLError as error:
        raise RuntimeError(f"Could not reach Meta: {error.reason}") from None


def graph_get(path, params, token):
    query = urllib.parse.urlencode({**params, "access_token": token})
    request = urllib.request.Request(f"{GRAPH}/{path.lstrip('/')}?{query}")
    return request_json(request)


def graph_post(path, data, token):
    body = {**data, "access_token": token}
    request = urllib.request.Request(
        f"{GRAPH}/{path.lstrip('/')}",
        data=urllib.parse.urlencode(body).encode("utf-8"),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    return request_json(request)


def get_page_context(page_id, user_token):
    """Resolve the Page token and linked Instagram professional account."""
    payload = graph_get(
        page_id,
        {"fields": "id,name,access_token,instagram_business_account"},
        user_token,
    )
    if str(payload.get("id", "")) != str(page_id):
        raise RuntimeError("Meta returned a Page ID that does not match FB_PAGE_ID.")
    page_token = payload.get("access_token")
    if not page_token:
        raise RuntimeError("Meta did not return a Page access token. Check that FB_PAGE_TOKEN is a User Access Token with pages_show_list and that the user can manage the configured Page.")
    return {
        "id": str(payload["id"]),
        "name": str(payload.get("name", "")),
        "access_token": page_token,
        "instagram_business_account": payload.get("instagram_business_account"),
    }
