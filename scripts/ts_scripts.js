const options = {
    autoPlay: true,
    fullScreen: {
        enable: false,
        zIndex: -1,
    },
    interactivity: {
        events: {
            onHover: {
                enable: true,
                mode: "repulse",
                distance: 1,
                resize: true
            },
        },
        modes: {
            repulse: {
                distance: 60,
                duration: 5,
                speed: 0.1,
            },
        }
    },
    particles: {
        color: {
            value: "#47D477"
        },
        links: {
            color: {
                value: "#b7b7b7"
            },
            distance: 150,
            opacity: 0.4
        },
        move: {
            enable: true,
            random: true,
            speed: 1
        },
        number: {
            density: {
                enable: true
            },
            value: 80
        },
        opacity: {
            random: {
                enable: true
            },
            value: {
                min: 0,
                max: 3
            },
            animation: {
                enable: true,
                speed: 1
            },
        },
        size: {
            random: {
                enable: true
            },
            value: {
                min: 0,
                max: 3
            },
            animation: {
                speed: 4,
                minimumValue: 0.3
            }

        }
    }
}

const black_options = {...options,
    fullScreen: {...options.fullScreen},
    particles: {...options.particles}
}
black_options.fullScreen.zIndex = 2;
black_options.particles.color = "#ffb7c5";
tsParticles.load("tsparticles", options);
tsParticles.load("tsparticles-black", black_options);
