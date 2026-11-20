/**
 * Clickable definitions. Any <button class="term" data-term="key"> opens a
 * small popover with the definition below. The footer glossary list is built
 * from the same entries, so there is only one place to edit a definition.
 */
(function () {
  const GLOSSARY = {
    embedded: ['Embedded AI', 'Artificial intelligence that runs directly on a small computer inside a device, like the Raspberry Pi on my car, instead of on a big server or in the cloud.'],
    simulator: ['Simulator', 'Computer software that imitates the real world. My simulator lets a virtual car drive on virtual tracks, so it can practice quickly and crash without breaking anything.'],
    sim2real: ['Sim-to-real gap', 'The difference between how something works in a simulator and how it works in real life. A car that drives perfectly in a simulator might slide, lag, or crash on a real floor.'],
    rl: ['Reinforcement learning (RL)', 'A type of machine learning where an agent learns by trial and error. It gets rewards for good actions (like making progress around the track) and penalties for bad ones (like crashing).'],
    policy: ['Policy', 'The "brain" that a reinforcement learning agent learns. It takes in what the car senses and decides how to steer and how fast to go.'],
    curriculum: ['Curriculum learning', 'Training a model on tasks in a planned order, like how a school class starts with easy lessons before hard ones. In my project, the "curriculum" is the order of practice tracks.'],
    discrepancy: ['Discrepancy score (Δ)', 'My measure of how wrong the simulator is about a track. It is the difference between the real lap time and the simulated lap time on that track.'],
    ppo: ['PPO (Proximal Policy Optimization)', 'A popular reinforcement learning algorithm. It improves the policy in small, careful steps so that training stays stable.'],
    f1tenth: ['F1TENTH', 'An open-source platform for 1/10-scale autonomous race cars. It includes F1TENTH Gym, a simulator that I use to train my car before it drives in real life.'],
    sb3: ['Stable-Baselines3', 'A Python library with ready-to-use reinforcement learning algorithms, including PPO. I use it to train my policy.'],
    lidar: ['LiDAR', 'A sensor that spins a laser and measures how far away objects are in every direction. My car uses it to "see" the walls of the track.'],
    step: ['Step', 'One small moment of driving. At each step, the car reads its sensors, the policy picks a steering angle and speed, and the car moves a tiny bit. My real-world budget is 15,000 steps, about 30 minutes of driving.'],
    episode: ['Episode', 'One practice run. An episode starts when the car is placed on the track and ends when it finishes a lap, crashes, or runs out of time.'],
    return: ['Return (score)', 'The total reward the car earns in one episode. The car earns points for moving forward and loses points for crashing, so a higher return means better driving.'],
    checkpoint: ['Checkpoint', 'A saved copy of the policy at one point in training. I test a checkpoint every 10,000 steps to see how the car improves over time.'],
    unseen: ['Unseen (held-out) tracks', 'Test tracks that the car never practices on. Testing on them shows whether the car really learned to drive or just memorized its practice tracks.'],
    generalization: ['Generalization', 'How well a trained model does on new situations it has not seen before, like driving on a brand-new track.'],
    iv: ['Independent variable', 'The thing I change on purpose in my experiment. For me, it is how the next practice track is chosen: at random, or by the biggest sim-to-real gap.'],
    dv: ['Dependent variable', 'The things I measure to see the effect of my change. For me, these are training steps, crashes, driving time, and performance on new tracks.'],
    cv: ['Controlled variable', 'Things I keep the same in every trial so that they do not affect the results, like the hardware and the learning algorithm.'],
    hyper: ['Hyperparameters', 'Settings chosen before training starts, like the learning rate or the size of the neural network. I keep them the same for both groups so the comparison is fair.'],
    seed: ['Random seed', 'A number that sets up the random choices in a run. Using 5 different seeds per group shows whether the results are consistent or just lucky.'],
    welch: ["Welch's t-test", 'A statistics test that checks whether the averages of two groups are really different. It works even when the two groups have different amounts of spread in their results.'],
    onnx: ['ONNX', 'A standard file format for neural networks. Converting my policy to ONNX lets it run quickly on the small Raspberry Pi computer in the car.'],
    pi: ['Raspberry Pi 5', 'A small, inexpensive computer about the size of a credit card. On my car, it runs the policy and reads the LiDAR.'],
    esp32: ['ESP32-S3', 'A microcontroller, which is a tiny computer that controls hardware. It takes commands from the Pi and turns them into exact signals for the steering servo and motor.'],
    uart: ['UART', 'A simple way for two boards to send data to each other over two wires, one for sending and one for receiving. My Pi and ESP32 talk this way.'],
    pwm: ['PWM (pulse-width modulation)', 'A signal that switches on and off very quickly. The length of each "on" pulse tells a servo what angle to turn to, or tells a speed controller how fast to run the motor.'],
    esc: ['ESC (electronic speed controller)', 'A circuit that controls how much power goes to the drive motor. Mine also has a built-in 5 V regulator that powers the servo and ESP32.'],
    ubec: ['UBEC', 'A voltage regulator that turns the 7.4 V battery power into a steady 5 V. Mine powers only the Raspberry Pi, so motor noise cannot reset it.'],
    lipo: ['LiPo battery', 'A lithium-polymer battery. It is light and powerful, but it can catch fire if it is damaged, over-drained, or charged the wrong way, so it needs careful handling.'],
    servo: ['Servo', 'A small motor that turns to an exact angle when it gets a PWM signal. On my car, it steers the front wheels.']
  };

  const pop = document.createElement('div');
  pop.id = 'gloss';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-live', 'polite');
  pop.innerHTML = '<button type="button" aria-label="Close definition">×</button><div class="g-head"><span class="g-term"></span><span class="g-tag">Definition</span></div><p></p>';
  document.body.appendChild(pop);
  const termEl = pop.querySelector('.g-term'), defEl = pop.querySelector('p');
  let current = null;

  function close() {
    pop.classList.remove('open');
    if (current) current.setAttribute('aria-expanded', 'false');
    current = null;
  }
  function open(btn) {
    const entry = GLOSSARY[btn.dataset.term];
    if (!entry) return;
    if (current === btn) { close(); return; }
    if (current) current.setAttribute('aria-expanded', 'false');
    current = btn;
    btn.setAttribute('aria-expanded', 'true');
    termEl.textContent = entry[0];
    defEl.textContent = entry[1];
    pop.classList.add('open');
    place();
  }
  function place() {
    if (!current) return;
    const btn = current;
    const r = btn.getBoundingClientRect();
    const w = pop.offsetWidth, h = pop.offsetHeight;
    let left = r.left + window.scrollX + r.width / 2 - w / 2;
    left = Math.max(window.scrollX + 16, Math.min(left, window.scrollX + document.documentElement.clientWidth - w - 16));
    let top = r.bottom + window.scrollY + 8;
    if (r.bottom + h + 16 > window.innerHeight && r.top > h + 16) top = r.top + window.scrollY - h - 8;
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }

  document.querySelectorAll('.term').forEach(btn => {
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.addEventListener('click', e => { e.stopPropagation(); open(btn); });
  });
  pop.querySelector('button').addEventListener('click', close);
  pop.addEventListener('click', e => e.stopPropagation());
  document.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { const c = current; close(); if (c) c.focus(); } });
  window.addEventListener('resize', place);

  // Footer glossary list, alphabetical
  const list = document.getElementById('glossary-list');
  if (list) {
    Object.values(GLOSSARY)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([t, d]) => {
        const div = document.createElement('div');
        div.innerHTML = '<dt></dt><dd></dd>';
        div.querySelector('dt').textContent = t;
        div.querySelector('dd').textContent = d;
        list.appendChild(div);
      });
  }
})();
