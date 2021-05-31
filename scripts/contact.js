const $_GET = new URLSearchParams(window.location.search);
const type = $_GET.get('type');
const form = document.getElementById("form");
const notification_zone = document.querySelector('.notification_area');

form.addEventListener('submit', function(event) {
    event.preventDefault();
    validate();
})
if (!["email", "discord"].includes(type)) {
    window.location = "./";


}

function delete_notif() {
    const button = this.parentNode;
    button.classList.add("hide");
    setTimeout(function () {
        notification_zone.removeChild(button);
    }, 3000);
}

function send_notification(text, level, dismiss=false) {
    const notification = document.createElement("div");
    const button = document.createElement("button");
    button.classList.add("delete");
    button.onclick = delete_notif;
    notification.classList.add("notification");
    notification.classList.add(level);
    notification.innerHTML = text;
    notification.appendChild(button);
    notification_zone.appendChild(notification);
    if (dismiss) {
        setTimeout(function () {
            delete_notif(button);
        }, 8000);
    }
}

const wss = new WebSocket("wss://websocket-eemi.herokuapp.com/");
wss.onopen = () => {
    console.log("Connexion au serveur réussi...");
}
wss.onerror = (event) => {
    console.log("Connexion au serveur impossible...");
    console.log(event);
}
wss.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);
        switch (data.status) {
            case "success":
                send_notification(data.message, "is-success");
                break;
            case "rate_limited":
                send_notification(data.message, "is-warning", true);
                break;
            default:
                send_notification(data.message, "is-danger");
                break;
        }
        console.log(data);
    } catch (e) {}
}
wss.onclose = () => {
    console.log("Connexion closed...");
}

function validate() {
    const type = document.getElementById("type");
    const full_name = document.getElementById("full_name");
    const email = document.getElementById("email");
    const message = document.getElementById("message");
    const email_regex = new RegExp("^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$", "m")
    if (!email_regex.test(email.value)) {
        return false;
    }
    if (full_name.value.length === 0) {
        return false;
    }
    if (message.value.length === 0) {
        return false;
    }
    const request = {
        type: type.value,
        data: {
            email: email.value,
            full_name: full_name.value,
            text: message.value
        }
    }
    wss.send(JSON.stringify(request));
}
