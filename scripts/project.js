function get_data(callback, data=null) {
    const request = new XMLHttpRequest();
    request.open('GET', '../data/project_list.json', true);
    request.onload = function () {
        if (this.status >= 200 && this.status < 400) {
            callback(JSON.parse(this.response), data);
        } else {
            console.log("ERREUR...");
            console.log("code = " + this.status);
            console.log("resp = " + this.response);
        }
    };
    request.onerror = function () {
        console.log("ERREUR...");
        console.log("code = " + this.status);
        console.log("resp = " + this.response);
    };
    request.send();
}

function get_image(project_data) {
    let image;
    if (project_data["image"] == null || project_data["image"].length === 0) {
        image = "../images/500.jpg";
    } else {
        image = "../images/project/" + project_data["image"];
    }
    return image;
}

function img_not_found() {
    this.src = "../images/500.jpg";
}

function process_all_data(project_list_data) {
    const embla = document.getElementById("embla__container");
    for (const [gist, project_data] of Object.entries(project_list_data)) {
        const a = document.createElement("a");
        const div = document.createElement("div");
        const bg_image = document.createElement("div");
        const image = document.createElement("img");
        a.href = "load_file.html?gist=" + gist;
        bg_image.classList.add("bg-image", "is-invisible", "wh-full");

        image.src = get_image(project_data);
        image.classList.add("embla__slide__img", "wh-full");
        image.alt = project_data["name"];
        image.onerror = img_not_found;

        div.classList.add("embla__slide", "wh-full");
        div.setAttribute("data-name", project_data["name"]);
        div.setAttribute("data-lang", project_data["lang"]);
        div.appendChild(bg_image);
        div.appendChild(image);
        a.appendChild(div);
        embla.appendChild(a);
    }
}

function markdown(text) {
    const italic =/(\*)(.*?)\1/;
    const bold = /(\*\*)(.*?)\1/;
    const line_break = /\[br]/;
    const line_break_x = /\[br-(\d)]/;
    const hr_break = /\[hr]/;
    const link = /(\[)(.*?)(]\()(.*?)(\))/;

    while (line_break_x.test(text)) {
        const line_break_x_matched = text.match(line_break_x);
        text = line_break_x[Symbol.replace](text, "<br class='my-5'>".repeat(line_break_x_matched[1]));
    }
    while (line_break.test(text)) {
        text = line_break[Symbol.replace](text, "<br class='my-5'>");
    }
    while (hr_break.test(text)) {
        text = hr_break[Symbol.replace](text, "<hr class='my-5'>");
    }
    while (bold.test(text)) {
        const bold_matched = text.match(bold);
        text = bold[Symbol.replace](text, "<strong>" + bold_matched[2] + "</strong>");
    }
    while (italic.test(text)) {
        const italic_matched = text.match(italic);
        text = italic[Symbol.replace](text, "<em>" + italic_matched[2] + "</em>");
    }
    while (link.test(text)) {
        const link_matched = text.match(link);
        text = link[Symbol.replace](text, "<a class='link' href='" + link_matched[4] + "'>" + link_matched[2] + "</a>");
    }
    return text;
}

function process_file(project_list_data, gist) {
    const gist_div      = document.getElementById("gist");
    const gist_mobile   = document.getElementById("gist-mobile");
    const title         = document.getElementById("title");
    const description   = document.getElementById("description");
    const wss           = new WebSocket("wss://websocket-eemi.herokuapp.com/");
    try {
        title.innerText = project_list_data[gist]["name"];
        description.innerHTML = markdown(project_list_data[gist]["description"]);
        document.title = project_list_data[gist]["name"];
        if (!gist) {
            alert("erreur, redirection vers la liste des projets...");
            window.location = "index.html";
        } else {
            wss.onopen = () => {
                console.log("Connexion au serveur réussi...");
                wss.send(JSON.stringify({type: "gist", gist: gist}));
            }
            wss.onerror = (event) => {
                console.log("Connexion au serveur impossible...");
                console.log(event);
            }
            wss.onmessage = (event) => {
                const data = JSON.parse(event.data);
                const style = document.createElement("link");
                style.rel = "stylesheet";
                style.href = data.stylesheet;
                style.type = "text/css";
                document.head.appendChild(style);
                gist_div.innerHTML = data.div;
                gist_mobile.innerHTML = data.div;
                wss.close();
            }

            wss.onclose = () => {
                console.log("Connexion closed...");
            }
        }
    } catch (e) {
        if (e instanceof TypeError) {
            window.location = "./";
        } else {
            console.log(e);
            document.title = "ERREUR 404";
            title.innerText = "ERREUR 404";
            description.innerText = "Gist not found...\ncheck console";
        }
    }
}
