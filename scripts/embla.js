const setupDotBtns = (dotsArray, embla) => {
    dotsArray.forEach((dotNode, i) => {
        dotNode.addEventListener("click", () => embla.scrollTo(i), false);
    });
};

const generateDotBtns = (dots, embla) => {
    const template = document.getElementById("embla-dot-template").innerHTML;
    dots.innerHTML = embla.scrollSnapList().reduce(acc => acc + template, "");
    return [].slice.call(dots.querySelectorAll(".embla__dot"));
};

const selectDotBtn = (dotsArray, embla) => () => {
    const previous = embla.previousScrollSnap();
    const selected = embla.selectedScrollSnap();
    dotsArray[previous].classList.remove("is-selected");
    dotsArray[selected].classList.add("is-selected");
};

function embla_gen(project_data, process_all_data) {
    process_all_data(project_data);
    const rootNode = document.querySelector('.embla');
    const viewportNode = rootNode.querySelector('.embla__viewport');
    const prevButtonNode = rootNode.querySelector('.embla__button--prev');
    const nextButtonNode = rootNode.querySelector('.embla__button--next');
    const dots = document.querySelector(".embla__dots");
    const options = {
        loop: true,
        startIndex: 0,
    }
    const embla = EmblaCarousel(viewportNode, options);
    const dotsArray = generateDotBtns(dots, embla);
    const setSelectedDotBtn = selectDotBtn(dotsArray, embla);

    setupDotBtns(dotsArray, embla);
    prevButtonNode.addEventListener('click', embla.scrollPrev, false);
    nextButtonNode.addEventListener('click', embla.scrollNext, false);
    embla.on("select", setSelectedDotBtn);
    embla.on("init", setSelectedDotBtn);
}
