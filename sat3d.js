/* ══════════════════════════════════════════════════════════════
   GRACE twin-satellite 3-D scene (three.js, vendored, offline).
   Lazy-created by main.js; loop runs only while its slide is active.
   All motion is delta-time based (clamped dt ≤ 50 ms).
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  window.Grace3D = {
    create: function (opts) {
      if (!window.THREE) throw new Error("three.js not loaded");
      const canvas = opts.canvas;

      // — renderer (throws → caller shows fallback) —
      const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 100);
      camera.position.set(0.6, 6.8, 11.2);
      camera.lookAt(-2.8, 0.8, 0);                  // frame the scene right of the text panel

      scene.add(new THREE.AmbientLight(0x8899bb, 0.85));
      const sun = new THREE.DirectionalLight(0xfff2dd, 1.15);
      sun.position.set(6, 9, 4);
      scene.add(sun);

      // — basin map plane (textured with the vendored data-URI) —
      const MAP_W = 11.5;
      let mapPlane = null;
      const loader = new THREE.TextureLoader();
      loader.load(window.GSLB_MAP_DATAURI, function (tex) {
        if (tex.anisotropy !== undefined) tex.anisotropy = 4;
        const ar = tex.image && tex.image.width ? tex.image.height / tex.image.width : 0.7;
        const geo = new THREE.PlaneGeometry(MAP_W, MAP_W * ar);
        const mat = new THREE.MeshBasicMaterial({ map: tex });
        mapPlane = new THREE.Mesh(geo, mat);
        mapPlane.rotation.x = -Math.PI / 2;
        mapPlane.position.y = 0;
        scene.add(mapPlane);
        // soft glow frame under the map
        const frame = new THREE.Mesh(
          new THREE.PlaneGeometry(MAP_W * 1.04, MAP_W * ar * 1.06),
          new THREE.MeshBasicMaterial({ color: 0x58cfc3, transparent: true, opacity: 0.10 })
        );
        frame.rotation.x = -Math.PI / 2;
        frame.position.y = -0.02;
        scene.add(frame);
      });

      // — water-mass anomaly dome (roughly over the Great Salt Lake) —
      const MASS = new THREE.Vector3(0.4, 0, -0.4);
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(1.5, 40, 24),
        new THREE.MeshPhongMaterial({
          color: 0x58cfc3, emissive: 0x1a5f58, transparent: true,
          opacity: 0.34, shininess: 60
        })
      );
      dome.scale.set(1, 0.34, 0.78);
      dome.position.copy(MASS);
      scene.add(dome);

      // pulsing ground ring around the anomaly
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.45, 1.55, 48),
        new THREE.MeshBasicMaterial({ color: 0x58cfc3, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(MASS.x, 0.02, MASS.z);
      scene.add(ring);

      // — geoid sheet: wireframe that dips over the mass —
      const GEO_SEG = 46;
      const geoidGeo = new THREE.PlaneGeometry(15, 10.5, GEO_SEG, Math.round(GEO_SEG * 0.7));
      const geoid = new THREE.Mesh(
        geoidGeo,
        new THREE.MeshBasicMaterial({ color: 0x5aa9e6, wireframe: true, transparent: true, opacity: 0.14 })
      );
      geoid.rotation.x = -Math.PI / 2;
      geoid.position.y = 2.1;
      scene.add(geoid);
      const geoBase = geoidGeo.attributes.position.array.slice();

      // — satellites —
      function makeSat() {
        const g = new THREE.Group();
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(0.52, 0.2, 0.26),
          new THREE.MeshPhongMaterial({ color: 0xd8dee9, shininess: 80 })
        );
        g.add(body);
        const panelMat = new THREE.MeshPhongMaterial({ color: 0x2a4d8f, emissive: 0x0d1f45, side: THREE.DoubleSide });
        [-0.52, 0.52].forEach(function (dx) {
          const p = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.26), panelMat);
          p.position.x = dx;
          p.rotation.x = -Math.PI / 2.4;
          g.add(p);
        });
        return g;
      }
      const satA = makeSat(), satB = makeSat();
      scene.add(satA); scene.add(satB);

      // ranging beam
      const beamGeo = new THREE.BufferGeometry();
      beamGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
      const beam = new THREE.Line(beamGeo, new THREE.LineBasicMaterial({ color: 0xffb454, transparent: true, opacity: 0.9 }));
      scene.add(beam);
      // ranging pulse
      const pulse = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xffd9a0 })
      );
      scene.add(pulse);
      // ground-track line
      const trackGeo = new THREE.BufferGeometry();
      const trackPts = [];
      for (let i = 0; i <= 40; i++) trackPts.push(new THREE.Vector3(-9 + 18 * i / 40, 3.1, -0.4));
      trackGeo.setFromPoints(trackPts);
      const track = new THREE.Line(trackGeo, new THREE.LineBasicMaterial({ color: 0x93a4bc, transparent: true, opacity: 0.16 }));
      scene.add(track);

      // — animation state —
      const ORBIT_Y = 3.1, ORBIT_Z = -0.4, SPAN = 9;   // x runs -SPAN..+SPAN
      const GAP0 = 2.2;                                 // 2.2 units ≈ 220 km
      let x = -SPAN, elapsed = 0, running = false, rafId = 0, lastTs = 0;
      if (window.__FF > 0) {                          // test fast-forward parity
        elapsed = window.__FF;
        x = -SPAN + 2.1 * window.__FF;
        while (x > SPAN + 3) x -= (2 * SPAN + 4);
      }

      // gravitational "potential" bump → lead sat pulled first, gap stretches
      function fpot(px) {
        return Math.tanh((px - MASS.x) / 1.6);
      }

      const v3 = new THREE.Vector3();
      function projectHUD(el, pos, w, h) {
        v3.copy(pos).project(camera);
        const vis = v3.z < 1 && Math.abs(v3.x) < 0.95 && Math.abs(v3.y) < 0.92;
        el.classList.toggle("on", vis);
        if (vis) {
          el.style.left = ((v3.x * 0.5 + 0.5) * w) + "px";
          el.style.top = ((-v3.y * 0.5 + 0.5) * h) + "px";
        }
      }

      function resize() {
        const r = canvas.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const need = Math.round(r.width) + "x" + Math.round(r.height);
        if (canvas._sz !== need) {
          canvas._sz = need;
          renderer.setSize(r.width, r.height, false);
          camera.aspect = r.width / r.height;
          camera.updateProjectionMatrix();
        }
      }

      function frame(ts) {
        if (!running) return;
        // recording mode: the clock is driven externally through window.__recNow
        if (window.__recNow !== undefined) ts = window.__recNow;
        let dt = (ts - lastTs) / 1000;
        lastTs = ts;
        if (dt > 0.05) dt = 0.05;
        if (dt < 0) dt = 0;
        elapsed += dt;

        resize();

        // fly-over: loop the pair across the map
        x += dt * 2.1;
        if (x > SPAN + 3) x = -SPAN - 1;
        const stretch = 0.35 * (fpot(x) - fpot(x - GAP0));  // grossly exaggerated
        const gap = GAP0 + stretch;
        satA.position.set(x, ORBIT_Y + 0.05 * Math.sin(elapsed * 1.7), ORBIT_Z);
        satB.position.set(x - gap, ORBIT_Y + 0.05 * Math.sin(elapsed * 1.7 + 1.2), ORBIT_Z);

        // beam + pulse
        const bp = beamGeo.attributes.position.array;
        bp[0] = satA.position.x; bp[1] = satA.position.y; bp[2] = satA.position.z;
        bp[3] = satB.position.x; bp[4] = satB.position.y; bp[5] = satB.position.z;
        beamGeo.attributes.position.needsUpdate = true;
        const pt = (elapsed * 1.6) % 1;
        pulse.position.lerpVectors(satB.position, satA.position, pt);

        // dome + ring breathing
        const breathe = 1 + 0.06 * Math.sin(elapsed * 1.4);
        dome.scale.set(breathe, 0.34 * breathe, 0.78 * breathe);
        const rp = (elapsed % 2.6) / 2.6;
        ring.scale.setScalar(0.6 + rp * 1.1);
        ring.material.opacity = 0.45 * (1 - rp);

        // geoid dip follows the anomaly, gently breathing
        const pos = geoidGeo.attributes.position;
        const amp = 0.55 + 0.1 * Math.sin(elapsed * 1.4);
        for (let i = 0; i < pos.count; i++) {
          const gx = geoBase[i * 3], gy = geoBase[i * 3 + 1];
          // plane local (x, y) → world (x, -y) after rotation; dip near mass
          const dx = gx - MASS.x, dz = -gy - MASS.z;
          const d2 = dx * dx + dz * dz;
          pos.array[i * 3 + 2] = geoBase[i * 3 + 2] - amp * Math.exp(-d2 / 2.4);
        }
        pos.needsUpdate = true;

        // readout: visual stretch is exaggerated; report a plausible µm-scale signal
        const dUm = stretch / 0.35 * 42;               // ±42 µm plausible swing
        if (opts.rangeEl) opts.rangeEl.textContent = (dUm >= 0 ? "+" : "−") + Math.abs(dUm).toFixed(1);

        // HUD labels
        const r = canvas.getBoundingClientRect();
        projectHUD(opts.hud.satA, satA.position, r.width, r.height);
        projectHUD(opts.hud.satB, satB.position, r.width, r.height);
        projectHUD(opts.hud.mass, dome.position, r.width, r.height);

        renderer.render(scene, camera);
        rafId = requestAnimationFrame(frame);
      }

      return {
        start: function () {
          if (running) return;
          running = true;
          lastTs = window.__recNow !== undefined ? window.__recNow : performance.now();
          rafId = requestAnimationFrame(frame);
        },
        stop: function () {
          running = false;
          if (rafId) cancelAnimationFrame(rafId);
          ["satA", "satB", "mass"].forEach(function (k) { opts.hud[k].classList.remove("on"); });
        }
      };
    }
  };
})();
