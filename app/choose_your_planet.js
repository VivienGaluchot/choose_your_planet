const choose_your_planet = function () {
    function* pairs(iterable) {
        for (var i = 0; i < iterable.length; i++) {
            for (var j = i + 1; j < iterable.length; j++) {
                yield { first: iterable[i], second: iterable[j] };
            }
        }
    }

    class Planet extends ph.Mobile {
        constructor() {
            super();
            this.isHovered = false;
            this.isAlive = true;
        }
    }

    class Sandbox {
        constructor(element, washer=false) {
            this.canvas = element;
            this.dpr = window.devicePixelRatio || 1;

            var rect = this.canvas.getBoundingClientRect();
            var side = rect.width;
            this.canvas.width = side * this.dpr;
            this.canvas.height = side * this.dpr;

            if (washer)
                this.pixelPerUnit = side / 26;
            else
                this.pixelPerUnit = side / 22;

            this.ctx = this.canvas.getContext("2d");
            
            this.planets = [];
            for (var i = -10; i <= 10; i++) {
                for (var j = -10; j <= 10; j++) {
                    var planet = new Planet();
                    planet.pos = new mt.Vect(i, j);
                    if (washer)
                        planet.vel = new mt.Vect(-j, i).scaleInplace(.4);
                    planet.mass = 10 * mt.randnBm() * mt.randnBm() * mt.randnBm();
                    this.planets.push(planet);
                }
            }

            this.champion = null;
            this.deadCount = 0;
            this.initialCount = this.planets.length;

            var handleClick = event => {
                if (this.champion != null)
                    return;
                var rect = this.canvas.getBoundingClientRect();
                var mouse = new mt.Vect(
                    (event.clientX - rect.left) * this.dpr,
                    (event.clientY - rect.top) * this.dpr);

                this.withRescale(it => {
                    var matrix = it.ctx.getTransform();
                    var imatrix = matrix.invertSelf();

                    var transformedMouse = new mt.Vect(
                        mouse.x * imatrix.a + mouse.y * imatrix.c + imatrix.e,
                        mouse.x * imatrix.b + mouse.y * imatrix.d + imatrix.f
                    );

                    for (var planet of it.planets) {
                        var ba = planet.pos.minus(transformedMouse);
                        if (ba.norm() < 2 * planet.radius()) {
                            it.champion = planet;
                            return;
                        }
                    }
                });
            };

            element.addEventListener("click", event => {
                handleClick(event);
            });

            element.addEventListener("touchend", event => {
                var touches = evt.changedTouches;
                for (var i = 0; i < touches.length; i++) {
                    handleClick(touches[i]);
                }
            });

            element.addEventListener("mousemove", event => {
                var rect = this.canvas.getBoundingClientRect();
                var mouse = new mt.Vect(
                    (event.clientX - rect.left) * this.dpr,
                    (event.clientY - rect.top) * this.dpr);

                this.withRescale(it => {
                    var matrix = it.ctx.getTransform();
                    var imatrix = matrix.invertSelf();

                    var transformedMouse = new mt.Vect(
                        mouse.x * imatrix.a + mouse.y * imatrix.c + imatrix.e,
                        mouse.x * imatrix.b + mouse.y * imatrix.d + imatrix.f
                    );

                    for (var planet of it.planets) {
                        var ba = planet.pos.minus(transformedMouse);
                        planet.isHovered = ba.norm() < 2 * planet.radius();
                    }
                });
            });
        };

        withRescale(lambda) {
            this.ctx.save();

            this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.scale(this.dpr, this.dpr);
            this.ctx.scale(this.pixelPerUnit, -1 * this.pixelPerUnit);

            lambda(this);

            this.ctx.restore();
        }

        bounds() {
            var w = this.canvas.width / (this.pixelPerUnit * this.dpr);
            var h = this.canvas.height / (this.pixelPerUnit * this.dpr);
            return {
                x: -w / 2, y: -h / 2, w: w, h: h
            };
        }

        animate(deltaTimeInS) {
            for (var planet of this.planets) {
                planet.animate(deltaTimeInS);
            }

            var bounds = this.bounds();
            for (var planet of this.planets) {
                if (planet.pos.x - planet.radius() < bounds.x) {
                    planet.pos.x = bounds.x + planet.radius();
                    planet.vel.x *= -0.5;
                }
                if (planet.pos.x + planet.radius() > bounds.x + bounds.w) {
                    planet.pos.x = bounds.x + bounds.w - planet.radius();
                    planet.vel.x *= -0.5;
                }
                if (planet.pos.y - planet.radius() < bounds.y) {
                    planet.pos.y = bounds.y + planet.radius();
                    planet.vel.y *= -0.5;
                }
                if (planet.pos.y + planet.radius() > bounds.y + bounds.h) {
                    planet.pos.y = bounds.y + bounds.h - planet.radius();
                    planet.vel.y *= -0.5;
                }
            }

            for (var pair of pairs(this.planets)) {
                if (pair.first.mass > 0 && pair.second.mass > 0) {
                    var ba = pair.first.pos.minus(pair.second.pos);

                    // collapse
                    if (ba.norm() < pair.first.radius() + pair.second.radius()) {
                        var big = null;
                        var eaten = null;
                        if (pair.first.mass >= pair.second.mass) {
                            big = pair.first;
                            eaten = pair.second;
                        } else {
                            big = pair.second;
                            eaten = pair.first;
                        }
                        var totalMass = big.mass + eaten.mass;
                        var a = big.vel.copy().scaleInplace(big.mass / totalMass);
                        var b = eaten.vel.copy().scaleInplace(eaten.mass / totalMass);
                        big.vel = a.addInplace(b);
                        big.mass += eaten.mass;
                        eaten.mass = 0;
                        eaten.isAlive = false;

                        this.deadCount += 1;
                    }
                }

                if (pair.first.mass > 0 && pair.second.mass > 0) {
                    // gravity
                    var grv = ph.computeGravity(0.005, ba, pair.first.mass, pair.second.mass);
                    pair.first.applyForce(grv.a);
                    pair.second.applyForce(grv.b);
                }
            }

            this.planets = this.planets.filter(planet => planet.mass > 0);
        }

        draw(avgDrawPeriodInMs = null) {
            this.ctx.save();

            // pre rescale draw
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            if (avgDrawPeriodInMs) {
                this.ctx.fillStyle = "#FFF2";
                this.ctx.font = "12px Verdana";
                this.ctx.fillText(`draw @ ${(1000 / avgDrawPeriodInMs).toFixed(1)} Hz`, 10, this.canvas.height - 10);
            }

            this.withRescale(_ => {
                // default style
                this.ctx.fillStyle = "#FFF";
                this.ctx.strokeStyle = "#DDD";
                this.ctx.lineWidth = 1 / this.pixelPerUnit;

                for (var planet of this.planets) {
                    this.drawPlanet(planet);
                }
            });

            this.ctx.restore();
        }

        drawPlanet(planet) {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(planet.pos.x, planet.pos.y, planet.radius(), 0, 2 * Math.PI);
            if (this.champion == planet) {
                // champion
                if (planet.isHovered) {
                    this.ctx.fillStyle = "#F0F";
                } else {
                    this.ctx.fillStyle = "#F0F8";
                }
            } else {
                if (planet.isHovered) {
                    this.ctx.fillStyle = "#FFF";
                } else {
                    this.ctx.fillStyle = "#FFF5";
                }
            }
            this.ctx.fill();
            this.ctx.restore();
        };
    }

    var sandbox = null;
    var randText = null;
    var outlivedCount = null;

    function reset(sandbox_el, washer) {
        sandbox = new Sandbox(sandbox_el, washer);
        randText = Math.random();
        outlivedCount = null;
    }

    function getDialog() {
        if (sandbox.champion != null) {
            if (sandbox.deadCount == 0) {
                outlivedCount = sandbox.deadCount;
                return `right, now cross your fingers and watch...`;
            } else if (sandbox.champion.isAlive && sandbox.deadCount < (sandbox.initialCount - 1)) {
                outlivedCount = sandbox.deadCount;
                var deadPercent = (100 * sandbox.deadCount / sandbox.initialCount).toFixed(1);
                return `it started, ${deadPercent}% are not anymore...`;
            } else {
                var outlivedPercent = null
                if (sandbox.champion.isAlive) {
                    outlivedPercent = 100;
                } else {
                    outlivedPercent = (100 * outlivedCount / (sandbox.initialCount - 1)).toFixed(1);
                }
                if (outlivedPercent < 50) {
                    if (randText < 0.2)
                        return `lame... I didn't even count.`;
                    else if (randText < 0.4)
                        return `player of the year`;
                    else if (randText < 0.6)
                        return `what was that?`;
                    else if (randText < 0.8)
                        return `brilliant init'?`;
                    else
                        return `did you understand the rules?`;
                } else if (outlivedPercent < 70) {
                    return `your planet outlived only ${outlivedPercent}%, was it random?`;
                } else if (outlivedPercent < 80) {
                    return `your planet outlived ${outlivedPercent}%, not bad... for a tea bag`;
                } else if (outlivedPercent < 90) {
                    return `your planet outlived ${outlivedPercent}%, not bad but would not have choosen this one...`;
                } else if (outlivedPercent < 95) {
                    return `your planet outlived ${outlivedPercent}%, starting to be good`;
                } else if (outlivedPercent < 97.5) {
                    return `your planet outlived ${outlivedPercent}%, wow, almost`;
                } else if (outlivedPercent < 100) {
                    return `${outlivedPercent}%, wow!!`;
                } else if (outlivedPercent == 100) {
                    return `respect. could not do better.`;
                } else {
                    return `cheat or bug?`;
                }
            }
        } else {
            return "choose your planet!";
        }
    }

    return {
        reset: reset,
        simulate: (sandbox_el, dialog_el, washer) => {
            reset(sandbox_el, washer);

            function dialog(text) {
                dialog_el.innerHTML = text;
            }

            var lastDrawInMs = null;
            var avgDrawPeriodInMs = null;

            var drawPeriodInMs = 1000 / 60;
            var redraw = () => {
                var currentTimeInMs = Date.now();
                var deltaTimeInMs = 0;
                if (lastDrawInMs != null) {
                    deltaTimeInMs = currentTimeInMs - lastDrawInMs;
                }
                lastDrawInMs = currentTimeInMs;


                if (sandbox.champion != null) {
                    sandbox.animate(drawPeriodInMs / 1000);
                }
                dialog(getDialog());
                sandbox.draw(avgDrawPeriodInMs);

                if (deltaTimeInMs > 0) {
                    if (avgDrawPeriodInMs != null) {
                        avgDrawPeriodInMs = avgDrawPeriodInMs * 0.95 + deltaTimeInMs * 0.05;
                    } else {
                        avgDrawPeriodInMs = deltaTimeInMs;
                    }
                }

                var fixed = drawPeriodInMs;
                if (avgDrawPeriodInMs) {
                    fixed -= avgDrawPeriodInMs - drawPeriodInMs;
                    fixed = Math.max(fixed, 0);
                }
                setTimeout(redraw, fixed);
            }
            redraw();
        }
    };
}();