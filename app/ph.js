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
        var squaredNorm = ba.x * ba.x + ba.y * ba.y;
        if (squaredNorm > 0 && aMass != 0 && bMass != 0) {
            var magn = G * aMass * bMass / squaredNorm;
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