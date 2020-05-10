// call the choose_your_planet.simulate when document is ready
document.addEventListener("DOMContentLoaded", (e) => {
    var washer = document.getElementById("whasher-checkbox").checked;
    choose_your_planet.simulate(document.getElementById("sandbox"), document.getElementById("dialog"), washer);
});

function retry() {
    var washer = document.getElementById("whasher-checkbox").checked;
    choose_your_planet.reset(document.getElementById("sandbox"), washer);
    return false;
}