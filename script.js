const mt = function () {
    function checkNumber(a) {
        if (typeof a != "number")
            throw Error("number expected");
        if (isNaN(a))
            throw Error("not a number");
    }

    class Vect {
        constructor(x = 0, y = 0) {
            checkNumber(x);
            checkNumber(y);
            this.x = x;
            this.y = y;
            // cache
            this._c_x = null;
            this._c_y = null;
            this._c_norm = null;
        }

        set(x = 0, y = 0) {
            checkNumber(x);
            checkNumber(y);
            this.x = x;
            this.y = y;
        }

        copy() {
            return new Vect(this.x, this.y);
        }

        norm() {
            if (this._c_x != this.x || this._c_y != this.y || this._c_norm == null) {
                this._c_norm = Math.sqrt(this.x * this.x + this.y * this.y);
            }
            return this._c_norm;
        }

        normalizeInplace() {
            if (this.norm() == NaN || this.norm() == 0)
                throw Error("math error");
            this.scaleInplace(1 / this.norm());
            return this;
        }

        setNorm(a) {
            checkNumber(a);
            if (a == NaN)
                throw Error("math error");
            this.normalizeInplace().scaleInplace(a);
            return this;
        }

        addInplace(other) {
            checkNumber(other.x);
            checkNumber(other.y);
            this.x += other.x;
            this.y += other.y;
            return this;
        }

        minus(other) {
            checkNumber(other.x);
            checkNumber(other.y);
            return new Vect(this.x - other.x, this.y - other.y);
        }

        scaleInplace(a) {
            checkNumber(a);
            this.x *= a;
            this.y *= a;
            return this;
        }

        capInplace(a) {
            checkNumber(a);
            var norm = this.norm();
            if (norm > a) {
                this.setNorm(a);
            }
            return this;
        }
    }

    return {
        Vect: Vect
    }
}();

const ph = function () {
    class Mobile {
        constructor() {
            this.pos = new mt.Vect();
            this.vel = new mt.Vect();
            this.acc = new mt.Vect();
            this.mass = 1;
        }

        applyForce(force) {
            if (this.mass == 0)
                throw Error("math error");
            this.acc.addInplace(force.copy().scaleInplace(1 / this.mass));
        }

        animate(deltaTimeInS) {
            this.vel.addInplace(this.acc);
            this.pos.addInplace(this.vel.copy().scaleInplace(deltaTimeInS));
            this.acc.set(0, 0);
        }

        radius() {
            return 0.2 * Math.cbrt(this.mass);
        }
    }

    function computeGravity(G, ba, aMass, bMass) {
        if (ba.norm() > 0 && aMass != 0 && bMass != 0) {
            var magn = G * aMass * bMass / (ba.norm() * ba.norm());
            var gra = ba.copy();
            gra.normalizeInplace().scaleInplace(magn);
            return { 'a': gra.copy().scaleInplace(-1), 'b': gra }
        } else {
            return { 'a': new mt.Vect(), 'b': new mt.Vect() }
        }
    }

    return {
        Mobile: Mobile,
        computeGravity: computeGravity
    }
}();

const boids = function () {
    function* pairs(iterable) {
        for (var i = 0; i < iterable.length; i++) {
            for (var j = i + 1; j < iterable.length; j++) {
                yield { first: iterable[i], second: iterable[j] };
            }
        }
    }

    class Bird extends ph.Mobile {
        constructor() {
            super();
            this.isHovered = false;
            this.isAlive = true;
        }
    }

    class Sandbox {
        constructor(element) {
            this.canvas = element;
            this.dpr = window.devicePixelRatio || 1;

            var rect = this.canvas.getBoundingClientRect();
            this.canvas.width = rect.width * this.dpr;
            this.canvas.height = rect.height * this.dpr;

            this.pixelPerUnit = rect.width / 25;

            this.ctx = this.canvas.getContext("2d");

            this.birds = [];
            for (var i = -10; i <= 10; i++) {
                for (var j = -10; j <= 10; j++) {
                    var bird = new Bird();
                    bird.pos = new mt.Vect(i, j);
                    bird.mass = 1 * Math.random() + 0.2;
                    this.birds.push(bird);
                }
            }

            this.champion = null;
            this.deadCount = 0;
            this.initialCount = this.birds.length;

            element.onclick = event => {
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

                    for (var bird of it.birds) {
                        var ba = bird.pos.minus(transformedMouse);
                        if (ba.norm() < 2 * bird.radius()) {
                            it.champion = bird;
                            return;
                        }
                    }
                });
            }

            element.onmousemove = event => {
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

                    for (var bird of it.birds) {
                        var ba = bird.pos.minus(transformedMouse);
                        bird.isHovered = ba.norm() < 2 * bird.radius();
                    }
                });
            };
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
            for (var pair of pairs(this.birds)) {
                if (pair.first.mass > 0 && pair.second.mass > 0) {
                    var ba = pair.first.pos.minus(pair.second.pos);

                    // collapse
                    if (ba.norm() < pair.first.radius() + pair.second.radius()) {
                        if (pair.first.mass >= pair.second.mass) {
                            pair.first.mass += pair.second.mass;
                            pair.second.mass = 0;
                            pair.second.isAlive = false;
                        } else {
                            pair.second.mass += pair.first.mass;
                            pair.first.mass = 0;
                            pair.first.isAlive = false;
                        }
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

            this.birds = this.birds.filter(bird => bird.mass > 0);

            for (var bird of this.birds) {
                bird.animate(deltaTimeInS);
            }

            var bounds = this.bounds();
            for (var bird of this.birds) {
                if (bird.pos.x - bird.radius() < bounds.x) {
                    bird.pos.x = bounds.x + bird.radius();
                    bird.vel.x *= -0.5;
                }
                if (bird.pos.x + bird.radius() > bounds.x + bounds.w) {
                    bird.pos.x = bounds.x + bounds.w - bird.radius();
                    bird.vel.x *= -0.5;
                }
                if (bird.pos.y - bird.radius() < bounds.y) {
                    bird.pos.y = bounds.y + bird.radius();
                    bird.vel.y *= -0.5;
                }
                if (bird.pos.y + bird.radius() > bounds.y + bounds.h) {
                    bird.pos.y = bounds.y + bounds.h - bird.radius();
                    bird.vel.y *= -0.5;
                }
            }
        }

        draw(avgDrawPeriodInMs = null, text = null) {
            this.ctx.save();

            // pre rescale draw
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            if (text) {
                this.ctx.font = "18px Verdana";
                this.ctx.fillStyle = "#FFFA";
                this.ctx.fillText(text, 10, 28);
            }
            if (avgDrawPeriodInMs) {
                this.ctx.fillStyle = "#FFF5";
                this.ctx.font = "12px Verdana";
                this.ctx.fillText(`draw @ ${(1000 / avgDrawPeriodInMs).toFixed(1)} Hz`, 10, this.canvas.height - 10);
            }

            this.withRescale(_ => {
                // default style
                this.ctx.fillStyle = "#FFF";
                this.ctx.strokeStyle = "#DDD";
                this.ctx.lineWidth = 1 / this.pixelPerUnit;

                for (var bird of this.birds) {
                    this.drawBird(bird);
                }
            });

            this.ctx.restore();
        }

        drawBird(bird) {
            this.ctx.save();
            if (this.champion == bird) {
                this.ctx.strokeStyle = "#F0F";
                if (bird.isHovered) {
                    this.ctx.fillStyle = "#F0F8";
                } else {
                    this.ctx.fillStyle = "#F0F3";
                }
            } else {
                this.ctx.strokeStyle = "#FFF";
                if (bird.isHovered) {
                    this.ctx.fillStyle = "#FFF8";
                } else {
                    this.ctx.fillStyle = "#FFF3";
                }
            }
            this.ctx.beginPath();
            this.ctx.arc(bird.pos.x, bird.pos.y, bird.radius(), 0, 2 * Math.PI);
            this.ctx.stroke();
            this.ctx.fill();
            this.ctx.restore();
        };
    }

    return {
        simulate: (element) => {
            console.log(`start simulation on ${element}`);
            sandbox = new Sandbox(element);

            var lastDrawInMs = null;
            var avgDrawPeriodInMs = null;
            var outlivedCount = null;
            var randText = Math.random();

            var drawPeriodInMs = 1000 / 60;
            var redraw = () => {
                var currentTimeInMs = Date.now();
                if (sandbox.champion != null) {
                    sandbox.animate(drawPeriodInMs / 1000);
                    if (sandbox.deadCount == 0) {
                        outlivedCount = sandbox.deadCount;
                        sandbox.draw(avgDrawPeriodInMs, `right, now cross your fingers and watch...`);
                    } else if (sandbox.champion.isAlive) {
                        outlivedCount = sandbox.deadCount;
                        var deadPercent = (100 * sandbox.deadCount / sandbox.initialCount).toFixed(1);
                        sandbox.draw(avgDrawPeriodInMs, `it started, ${deadPercent}% are not anymore...`);
                    } else {
                        var outlivedPercent = (100 * outlivedCount / (sandbox.initialCount - 1)).toFixed(1);
                        var text = null;
                        if (outlivedPercent < 50) {
                            if (randText < 0.2)
                                text = `lame... I didn't even count.`;
                            else if (randText < 0.4)
                                text = `player of the year`;
                            else if (randText < 0.6)
                                text = `what was that ?`;
                            else if (randText < 0.8)
                                text = `brilliant`;
                            else
                                text = `did you understood the rules ?`;
                        } else if (outlivedPercent < 70) {
                            text = `your planet outlived only ${outlivedPercent}%, was it random ?`;
                        } else if (outlivedPercent < 80) {
                            text = `your planet outlived ${outlivedPercent}%, not bag... for a tea bag`;
                        } else if (outlivedPercent < 90) {
                            text = `your planet outlived ${outlivedPercent}%, not bad but would not have choosen this one...`;
                        } else if (outlivedPercent < 95) {
                            text = `your planet outlived ${outlivedPercent}%, starts to be good`;
                        } else if (outlivedPercent < 97.5) {
                            text = `your planet outlived ${outlivedPercent}%, wow, almost`;
                        } else if (outlivedPercent < 100) {
                            text = `${outlivedPercent}%, wow !!`;
                        } else if (outlivedPercent == 100) {
                            text = `respect. could not do better.`;
                        } else {
                            text = `cheat or bug ?`;
                        }
                        sandbox.draw(avgDrawPeriodInMs, text);
                    }
                } else {
                    sandbox.draw(avgDrawPeriodInMs, "choose your planet !");
                }

                var deltaTimeInMs = 0;
                if (lastDrawInMs != null) {
                    deltaTimeInMs = currentTimeInMs - lastDrawInMs;
                }
                lastDrawInMs = currentTimeInMs;
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


// call the boids.simulate when document is ready
document.addEventListener("DOMContentLoaded", (e) => {
    boids.simulate(document.getElementById("sandbox"));
});