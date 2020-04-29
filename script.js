const mt = function () {
    class Vect {
        constructor(x = 0, y = 0) {
            this.x = x;
            this.y = y;
        }

        set(x = 0, y = 0) {
            this.x = x;
            this.y = y;
        }

        copy() {
            return new Vect(this.x, this.y);
        }

        norm() {
            return Math.sqrt(this.x * this.x + this.y * this.y);
        }

        normalizeInplace() {
            this.scaleInplace(1 / this.norm());
            return this;
        }

        setNorm(a) {
            this.normalizeInplace().scaleInplace(a);
            return this;
        }

        addInplace(other) {
            this.x += other.x;
            this.y += other.y;
            return this;
        }

        minus(other) {
            return new Vect(this.x - other.x, this.y - other.y);
        }

        scaleInplace(a) {
            this.x *= a;
            this.y *= a;
            return this;
        }

        cap(a) {
            var norm = this.norm();
            if (norm > a) {
                this.setNorm(a);
            }
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

    class Gravity {
        constructor(G = .005) {
            this.G = G;
        }

        getForces(mobA, mobB) {
            var ba = mobA.pos.minus(mobB.pos);
            var baNorm = ba.norm();
            if (baNorm > 0) {
                var magn = this.G * mobA.mass * mobB.mass / (baNorm * baNorm);
                ba.normalizeInplace().scaleInplace(magn);
                ba.cap(5);
                return { 'a': ba.copy().scaleInplace(-1), 'b': ba }
            } else {
                return { 'a': new mt.Vect(), 'b': new mt.Vect() }
            }
        }
    }

    return {
        Mobile: Mobile,
        Gravity: Gravity
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
        }
    }

    class Sandbox {
        constructor(element) {
            this.canvas = element;
            this.pixelPerUnit = 20;

            this.dpr = window.devicePixelRatio || 1;

            var rect = this.canvas.getBoundingClientRect();
            this.canvas.width = rect.width * this.dpr;
            this.canvas.height = rect.height * this.dpr;

            this.ctx = this.canvas.getContext("2d");

            this.birds = [];
            for (var i = -10; i < 10; i++) {
                for (var j = -10; j < 10; j++) {
                    var bird = new Bird();
                    bird.pos = new mt.Vect(i, j);
                    bird.mass = 1 * Math.random() + 0.2;
                    this.birds.push(bird);
                }
            }

        };

        bounds() {
            var w = this.canvas.width / (this.pixelPerUnit * this.dpr);
            var h = this.canvas.height / (this.pixelPerUnit * this.dpr);
            return {
                x: -w / 2, y: -h / 2, w: w, h: h
            };
        }

        animate(deltaTimeInS) {
            for (var pair of pairs(this.birds)) {
                if (pair.first.pos.minus(pair.second.pos).norm() < pair.first.radius() + pair.second.radius()) {
                    // collapse
                    if (pair.first.mass >= pair.second.mass) {
                        pair.first.mass += pair.second.mass;
                        pair.second.mass = 0;
                    } else {
                        pair.second.mass += pair.first.mass;
                        pair.first.mass = 0;
                    }
                }
            }
            this.birds = this.birds.filter(bird => bird.mass > 0);

            var gravity = new ph.Gravity();
            for (var pair of pairs(this.birds)) {
                var grv = gravity.getForces(pair.first, pair.second);
                pair.first.applyForce(grv.a);
                pair.second.applyForce(grv.b);
            }

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

        draw(avgAnimatePeriodInMs = null, avgDrawPeriodInMs = null) {
            this.ctx.save();

            // pre rescale draw
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = "#FFF5";
            this.ctx.font = "12px Verdana";
            if (avgAnimatePeriodInMs) {
                this.ctx.fillText(`animate @ ${(1000 / avgAnimatePeriodInMs).toFixed(1)} Hz`, 10, 22);
            }
            if (avgDrawPeriodInMs) {
                this.ctx.fillText(`draw @ ${(1000 / avgDrawPeriodInMs).toFixed(1)} Hz`, 10, 34);
            }

            // rescale
            this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.scale(this.dpr, this.dpr);
            this.ctx.scale(this.pixelPerUnit, -1 * this.pixelPerUnit);

            // default style
            this.ctx.fillStyle = "#FFF";
            this.ctx.strokeStyle = "#DDD";
            this.ctx.lineWidth = 1 / this.pixelPerUnit;

            // post rescale draw
            this.ctx.save();
            this.ctx.strokeStyle = "#F008";
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(1, 0);
            this.ctx.stroke();

            this.ctx.strokeStyle = "#0F08";
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(0, 1);
            this.ctx.stroke();

            var bounds = this.bounds();
            this.ctx.strokeStyle = "#FFF4";
            this.ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
            this.ctx.restore();

            for (var bird of this.birds) {
                this.drawBird(bird);
            }

            this.ctx.restore();
        }

        drawBird(bird) {
            this.ctx.save();
            this.ctx.fillStyle = "#FFF3";
            this.ctx.strokeStyle = "#FFF";
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

            var lastAnimateInMs = null;
            var lastDrawInMs = null;
            var avgAnimatePeriodInMs = null;
            var avgDrawPeriodInMs = null;

            var animatePeriodInMs = 1000 / 200;

            var animate = () => {
                var currentTimeInMs = Date.now();
                var deltaTimeInMs = 0;
                if (lastAnimateInMs != null) {
                    deltaTimeInMs = currentTimeInMs - lastAnimateInMs;
                }

                sandbox.animate(Math.min(deltaTimeInMs, 10 * animatePeriodInMs) / 1000);

                lastAnimateInMs = currentTimeInMs;
                if (deltaTimeInMs > 0) {
                    if (avgAnimatePeriodInMs != null) {
                        avgAnimatePeriodInMs = avgAnimatePeriodInMs * 0.95 + deltaTimeInMs * 0.05;
                    } else {
                        avgAnimatePeriodInMs = deltaTimeInMs;
                    }
                }

                var fixed = animatePeriodInMs;
                if (avgAnimatePeriodInMs) {
                    fixed -= avgAnimatePeriodInMs - animatePeriodInMs;
                    fixed = Math.max(fixed, 0);
                }
                setTimeout(animate, fixed);
            }
            animate();

            var drawPeriodInMs = 1000 / 60;
            var redraw = () => {
                var currentTimeInMs = Date.now();
                sandbox.draw(avgAnimatePeriodInMs, avgDrawPeriodInMs);

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
                    fixed -= avgDrawPeriodInMs - animatePeriodInMs;
                    fixed = Math.max(fixed, 0);
                }
                setTimeout(redraw, drawPeriodInMs);
            }
            redraw();
        }
    };
}();


// call the boids.simulate when document is ready
document.addEventListener("DOMContentLoaded", (e) => {
    boids.simulate(document.getElementById("sandbox"));
});