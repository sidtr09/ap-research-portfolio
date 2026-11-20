# Racing the Reality Gap

**AP Research Digital Portfolio · Siddharth Tirumalareddi · 2026–27**

🔗 **Live site: [sidtr09.github.io/ap-research-portfolio](https://sidtr09.github.io/ap-research-portfolio/)**

> *Curriculum Learning via Simulation-to-Reality Discrepancy for Budget-Constrained Autonomous Racing*

## The project in one paragraph

A self-driving car can practice millions of times in a simulator, but practice on a real car is slow and expensive. Batteries run out, parts break, and someone has to reset the car after every crash. A driving policy that works perfectly in simulation also often struggles on a real floor. My project asks whether a 1/10-scale autonomous race car can learn faster with a fixed amount of real-world practice if it spends that practice on the tracks where the simulator is **most wrong**. I compare that strategy against choosing practice tracks at random.

**Research question:** If a self-driving RC car only gets a fixed amount of real-world practice, will it learn to race faster and use fewer resources if it practices on the tracks with the biggest simulation-to-reality gap instead of on random tracks?

**Hypothesis:** If the car practices on the tracks where the simulator is most wrong, then it will learn to finish laps on new tracks using fewer real-world steps and with fewer crashes than a car that practices on randomly chosen tracks.

## What's on the website

| Section | What you'll find |
|---|---|
| **Home** | The project title and an animation of a simulated car and a real car lapping the same track, with the gap between them shown live. |
| **01 · About** | Who I am, my skills and coursework, past projects, and a few fun facts. |
| **02 · Process** | The research question and hypothesis, where the idea came from, a step-by-step diagram of the experiment, the variables, the five papers I built on, and a project timeline. |
| **03 · Build** | An interactive 3D model of the car that you can rotate, explode, and click on to learn what each part does. It also has a wiring diagram, a pin table, and the parts list. |
| **04 · Data** | Real results from my first phase: a baseline policy trained for 100,000 steps in the simulator. Its best lap improved from 50.0 s to 39.6 s. The real-car results will be added after testing. |
| **05 · Perspective** | Inspiration, possible impact, a research journal, and safety procedures. Some reflection pieces are still in progress. |
| **06 · Contact** | How to reach me, a glossary of key terms, and my references. |

Technical words throughout the site are underlined. Click any of them for a quick, plain-English definition.

## Key finding so far

In the simulator, my car needed about **33,000 practice steps** just to finish its first full lap. On the real car, the entire budget is **15,000 steps** (about 30 minutes of driving). That means the real car can't learn from scratch, so every real-world step has to count. This is the main reason I'm testing a smarter way to choose what to practice.

## Experiment at a glance

- **Independent variable:** how the next practice track is chosen (random vs. biggest sim-to-real gap)
- **Dependent variables:** real-world steps needed to finish 3 clean laps, total crashes and driving time, and performance on 3 unseen tracks
- **Controlled variables:** same car hardware, same learning algorithm (PPO) and settings, same 15,000-step budget
- **Trials:** 5 runs per strategy, compared with Welch's t-test (α = 0.05)

## Timeline

| When | Phase | Status |
|---|---|---|
| Aug – Oct 2026 | Simulator setup and baseline training | ✅ Complete |
| Nov 2026 | Building and wiring the real car | 🔧 In progress |
| Dec 2026 – Feb 2027 | Real-world trials | Upcoming |
| Mar – Apr 2027 | Testing on new tracks, statistics, paper | Upcoming |

## The car

- **Chassis:** 1/10-scale rear-wheel-drive RC car
- **Computer:** Raspberry Pi 5 (runs the driving policy)
- **Controller:** ESP32-S3 (sends steering and throttle signals)
- **Sensor:** WayPonDEV LD19 360° LiDAR
- **Power:** 2S 7.4 V LiPo battery with separate power systems for the computer and the motors
- **Software:** F1TENTH Gym, Stable-Baselines3 (PPO), PyTorch, ONNX

## References

1. Astudillo, R., Jiang, D. R., Balandat, M., Bakshy, E., & Frazier, P. I. (2021). Multi-step budgeted Bayesian optimization with unknown evaluation costs. *NeurIPS, 34*, 20197–20209.
2. Bengio, Y., Louradour, J., Collobert, R., & Weston, J. (2009). Curriculum learning. *Proceedings of ICML*, 41–48.
3. Dulac-Arnold, G., Levine, N., Mankowitz, D. J., Li, J., Paduraru, C., Gowal, S., & Hester, T. (2021). Challenges of real-world reinforcement learning. *Machine Learning, 110*(9), 2419–2468.
4. O'Kelly, M., Zheng, H., Karthik, D., & Mangharam, R. (2020). F1TENTH: An open-source evaluation environment for continuous control and reinforcement learning. *PMLR 123*, 77–89.
5. Rutherford, A., Beukman, M., Willi, T., Lacerda, B., Hawes, N., & Foerster, J. (2024). No regrets: Investigating and improving regret approximations for curriculum discovery. *NeurIPS, 37*, 16071–16101.

## Contact

📧 [siddharth.tirumalareddi@gmail.com](mailto:siddharth.tirumalareddi@gmail.com) · 🐙 [github.com/sidtr09](https://github.com/sidtr09)

---

<sub>Built with plain HTML, CSS, and JavaScript, using Three.js for the 3D model. Hosted on GitHub Pages.</sub>
