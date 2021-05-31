const nodemailer = require("nodemailer");
const WebSocket = require('ws');
const crypto = require("crypto");
const Base58 = require("base-58");
const https = require('https');
const rateLimiterFlexible = require("rate-limiter-flexible");
const opts = {
	points: 2, // 2 points
    duration: 5, // Per second
};

const rateLimiter = new rateLimiterFlexible.RateLimiterMemory(opts);

const webhooks_payload = {
    username: "Portfolio Contact Page",
    avatar_url: "https://cyvax.fr/eemi/cyvax.png",
    embeds: [{
        author: {
            name: "Portfolio Contact Page",
            url: "https://cyvax.fr/",
            icon_url: "https://cyvax.fr/eemi/cyvax.png"
        },
        thumbnail: {
            url: "https://cyvax.fr/eemi/cyvax.png"
        },
        title: "", // 256 char
        description: "", // 2048 char
        color: 3196557,
        timestamp: "",
        fields: [
            {
                "name": "Message",
                "value": "" // 1024 char...
            }
        ],
    }]
}

const transporter = nodemailer.createTransport({
    host: "plesk1.dyjix.eu",
    port: 465,
    secure: true,
    auth: {
        user: "no-reply@cyvax.fr",
        pass: "", // Mail Password.
    },
});

function send_webhooks(payload) {
    payload = JSON.stringify(payload);
    const options = {
        hostname: "discord.com",
        port: 443,
        path: "", // Discord Webhook URL
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "JSONHttpRequest",
            "Content-Length": payload.length
        }
    }

    const webhooks_req = https.request(options, (resp) => {
        console.log(`statusCode: ${resp.statusCode}`)
        resp.setEncoding("utf8");
        resp.on("data", (d) => {
            console.log(JSON.parse(d));
        })
    })
    webhooks_req.on("error", (error) => {
        console.log({"status": "error", "error": error});
    })
    webhooks_req.write(payload)
    webhooks_req.end()
}

async function generate(text) {
    const iv = crypto.randomBytes(16);
    const salt = crypto.randomBytes(8);
    const passwd = crypto.randomBytes(32);
    const buffer_text = Buffer.from(JSON.stringify({paste: text}), 'utf8');
    let auth_data = [
        [
            iv.toString("base64"),
            salt.toString("base64"),
            100000,
            256,
            128,
            "aes",
            "gcm",
            "none"],
        "markdown",
        0,
        0
    ];
    let key = crypto.pbkdf2Sync(passwd, salt, 100000, 32, "sha256");

    function encrypt(text) {
        let cipher = crypto.createCipheriv("aes-256-gcm", key, iv, {
            authTagLength: Math.floor(128 * 0.125)});
        cipher.setAAD(Buffer.from(JSON.stringify(auth_data), "utf8"));
        return {
            ct: Buffer.concat([cipher.update(text), cipher.final(), cipher.getAuthTag()]).toString("base64"),
            auth_data: auth_data,
        };
    }

    let crypt = encrypt(buffer_text);
    let data = JSON.stringify({"v": 2, "adata": crypt.auth_data, "ct": crypt.ct, "meta": {"expire": "1week"}})
    return {"data": data, "passwd": passwd};
}

async function post(text, payload, object) {
    let data = await generate(text);
    let options = {
        hostname: "paste.cyvax.fr",
        port: 443,
        path: "/",
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "JSONHttpRequest",
            "Content-Length": data.data.length
        }
    }

    let paste_req = https.request(options, (resp) => {
        console.log(`statusCode: ${resp.statusCode}`)
        resp.setEncoding("utf8");
        resp.on("data", (d) => {
            const key = Base58.encode(data.passwd);
            data = JSON.parse(d);
            switch (data.status) {
                case 0:
                    payload.embeds[0].fields[0].value = `See here : https://paste.cyvax.fr/?${data.id}#${key}`;
                    send_webhooks(payload);
                    break;
                default:
                    console.log("ERROR, could not write text, trying to send mail.");
                    transporter.sendMail({
                        from: object.email,
                        to: "contact@cyvax.fr",
                        replyTo: object.email,
                        subject: `[Portfolio] ${object.full_name}'s send you a message!`,
                        text: object.text
                    });
                    payload.embeds[0].fields[0].value = "Please check mail for this...";
                    send_webhooks(payload);
                    break;
            }
        })
    })
    paste_req.on("error", (error) => {
        console.log({"status": "error", "error": error});
    })
    paste_req.write(data.data)
    paste_req.end()
}

function process_webhook(data) {
    const payload = {...webhooks_payload};
    let full_name = data.full_name;
    let email = data.email;
    let text = data.text;
    if (full_name.length > 222) {
        full_name = full_name.substring(0, 219) + "...";
    }
    if (email.length > 2045) {
        email = email.substring(0, 2045) + "..."; // ?? It should never happen but idiots are always out...
    }
    payload.embeds[0].title = `[Portfolio] ${full_name}'s send you a message!`;
    payload.embeds[0].description = email;
    payload.embeds[0].timestamp = new Date().toISOString();
    if (text.length <= 1024) {
        payload.embeds[0].fields[0].value = text;
        send_webhooks(payload);
    } else {
        post(data.text, payload, data).then(() => {console.log("Done...")});
    }
}
const port = process.env.PORT || 5000
const wss = new WebSocket.Server({ port: port });

wss.on('connection', function connection(ws, req) {
    ws.on('message', function incoming(message) {
        try {
            const object = JSON.parse(message);
            switch (object.type) {
                case "discord":
                    rateLimiter.consume(req.connection.remoteAddress, 2) // Consume 2 points
                        .then(() => {
                            process_webhook(object.data);
                            ws.send(JSON.stringify({status: "success", message: "message délivré avec succès"}));
                        })
                        .catch(() => {
                            ws.send(JSON.stringify({status: "rate_limited", message: "Vous ne pouvez pas faire ça actuellement, réessayer dans quelques secondes..."}))
                        });
                    break;
                case "email":
                    rateLimiter.consume(req.connection.remoteAddress, 2) // Consume 2 points
                        .then(() => {
                            transporter.sendMail({
                                from: object.data.email,
                                to: "contact@cyvax.fr",
                                replyTo: object.data.email,
                                subject: `[Portfolio] ${object.data.full_name}'s send you a message!`,
                                text: object.data.text
                            });
                            ws.send(JSON.stringify({status: "success", message: "message délivré avec succès"}));
                        })
                        .catch(() => {
                            ws.send(JSON.stringify({status: "rate_limited", message: "Vous ne pouvez pas faire ça actuellement, réessayer dans quelques secondes..."}))
                        });
                    break;
                case "gist":
                    const https = require('https');
                    let options = {
                        hostname: "gist.github.com",
                        port: 443,
                        path: `/cyvax/${object.gist}.json`,
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            "X-Requested-With": "JSONHttpRequest",
                        }
                    }
                    let data = "";
                    const request = https.request(options, res => {
                        console.log(`statusCode: ${res.statusCode}`);
                        res.on('data', d => {
                            data += d;
                        })
                        res.on('close', function () {
                            console.log("sended gist data...")
                            ws.send(data);
                        })
                        request.on('error', error => {
                            console.error(error);
                        })
                    })
                    request.end();
                    break;
                default:
                    ws.send(JSON.stringify({"status": "error", "message": "Type inconnu, merci de réessayer"}));
            }
        } catch (e) {
            console.log(e);
            ws.send(JSON.stringify({"status": "error", "message": "Erreur, merci de signaler ce bug à CyVaX grâce au formulaire contact."}));
        }
    });
});