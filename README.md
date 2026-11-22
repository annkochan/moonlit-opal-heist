# Moonlit Opal Heist

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/annkochan/moonlit-opal-heist/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/annkochan/moonlit-opal-heist/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

An original top-down stealth heist game that runs in the browser, built for the
[make.fun](https://make.fun/bounty/best-heist-game-20261122-0559) "Make the best heist game" bounty.

Cross a guarded vault at night, stay out of the guards' flashlight beams and the
cameras' sweeping cones, lift the Moonlit Opal, and slip back out the entrance.
Being seen fills the alarm meter; a full meter sends every guard hunting you.
Toss coins to pull a guard off his route, sneak quietly, or sprint and risk it.

## Play

```sh
node serve.ts
# then open http://localhost:8080
```

The game is plain static files under `game/` — no build step, no network.
`node main.ts` (with `MAKEFUN_OUTPUT_DIR` outside the grader) copies `game/`
and `screenshots/` to the output directory and writes `dossier.json`.

## Controls

- WASD / arrow keys: move
- Shift: sprint (faster, but the alarm fills faster while you are seen)
- C: sneak (slower, much harder to spot)
- E: take the opal
- Mouse click: toss a coin decoy
- R: restart

## License

MIT — see `LICENSE`.
