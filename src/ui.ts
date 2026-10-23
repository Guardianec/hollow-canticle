import { BIOMES, ENEMIES, RELICS, WEAPONS } from './game/data';
import { makeFloor, obstaclesFor } from './game/dungeon';
import { persist, defaultSave, SAVE_KEY } from './game/save';
import { World } from './game/world';

const escape = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const icon = (name: string, size = 18): string => {
  const paths: Record<string, string> = {
    sound:
      '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    mute: '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m16 9 6 6m0-6-6 6"/>',
    expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
    pause: '<path d="M8 5v14m8-14v14"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    book: '<path d="M12 5C9 3 5 3 2 4v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-3-1-7-1-10 1Zm0 0v15"/>',
    sword: '<path d="m15 3 6 0 0 6-10 10-6-6L15 3Zm-8 8 6 6M3 21l5-5M3 15l6 6"/>',
    gear: '<path d="m10 3-1 3-3 1-3 3 2 2-1 4 3 2 4 3 2-2 4 1 2-3 3-4-2-2 1-4-3-2-4-3-2 2Z"/><circle cx="12" cy="12" r="3"/>',
    seed: '<path d="M20 3C8 2 3 7 4 14c7 4 15-1 16-11ZM4 21c1-7 6-12 11-14"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
  };
  return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.sword}</svg>`;
};
const sigil = `<svg class="sigil" aria-hidden="true" viewBox="0 0 80 80"><circle cx="40" cy="40" r="31"/><circle cx="40" cy="40" r="26"/><path d="m40 5 7 26 22 9-22 9-7 26-7-26-22-9 22-9Zm0 18 4 17-4 17-4-17Z"/></svg>`;

export class Interface {
  private dialog: HTMLDialogElement;
  private menu: HTMLElement;
  private lastMode = '';
  private screen = '';
  private settingsBack = 'menu';
  private lastVolume = 0.65;
  private lastMute?: boolean;
  private lastStatus = '';
  private runWeapon = 'sword';
  private returnMode: 'menu' | 'paused' = 'menu';
  constructor(private world: World) {
    document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
      <header class="topbar">
        <a class="brand" href="#" aria-label="Hollow Canticle main menu">${sigil}<span>HOLLOW CANTICLE</span><span class="version">v0.1.0</span></a>
        <span class="header-caption">A VOW IN THE DARK</span>
        <div class="utility"><button data-action="sound" aria-label="Mute audio" title="Toggle audio">${icon('sound')}</button><span></span><button data-action="fullscreen" aria-label="Fullscreen" title="Fullscreen">${icon('expand')}</button><button data-action="pause" aria-label="Pause or open settings" title="Pause · Esc">${icon('pause')}</button></div>
      </header>
      <main id="stage">
        <div id="game" role="img" aria-label="Hollow Canticle dungeon. Keyboard controls are listed below."></div>
        <section id="main-menu" class="main-menu" aria-label="Main menu">
          <div class="menu-kicker"><span></span> PRECISION. PATIENCE. DESCENT.</div>
          <h1>HOLLOW<br><span>CANTICLE</span></h1>
          <p class="menu-copy">The bells have fallen silent.<br>Let your blade be the last thing they hear.</p>
          <button class="begin-button" data-action="new"><span>Begin the descent</span>${icon('arrow', 21)}</button>
          <div class="secondary-actions"><button data-action="training">${icon('sword', 17)} Learn the rhythm</button><button data-action="seeded">${icon('seed', 17)} Seeded run</button></div>
          <div class="menu-line"></div>
          <nav class="menu-links"><button data-action="archive">Chronicle <span>DISCOVERIES & OATHS</span></button><button data-action="settings">Settings ${icon('gear', 15)}</button><button data-action="credits">Credits</button></nav>
          <div class="menu-note"><span class="note-mark">✧</span><p>Read the blade. Break their guard.<br><b>Keep your oath.</b></p></div>
        </section>
        <div class="location-stamp"><span class="stamp-rule"></span><span id="location-label">01 / THE FORGOTTEN RUINS</span><small id="location-sub">WHERE THE BELLS FELL SILENT</small></div>
        <div class="mobile-notice">A keyboard and mouse are needed for the descent.<br>You can explore the menus on this device.</div>
        <div id="live-status" class="sr-only" role="status" aria-live="polite"></div>
        <dialog id="overlay" aria-labelledby="dialog-title"></dialog>
      </main>
      <footer class="bottombar"><div class="control-guide"><span><kbd>W A S D</kbd> Move</span><span><kbd>J</kbd> Strike</span><span><kbd>K</kbd> Deflect</span><span><kbd>SPACE</kbd> Evade</span><span><kbd>E</kbd> Interact</span><span><kbd>Q</kbd> Resonance</span></div><button data-action="controls">Field guide ${icon('book', 14)}</button><span class="footer-end">DEATH IS A LESSON. <b>DESCEND AGAIN.</b></span></footer>`;
    this.dialog = document.querySelector('#overlay')!;
    this.menu = document.querySelector('#main-menu')!;
    document.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (button) {
        this.world.audio.unlock();
        this.action(button.dataset.action!);
      }
      const brand = (event.target as HTMLElement).closest('.brand');
      if (brand) {
        event.preventDefault();
        if (this.world.mode === 'playing') this.pause();
        else if (this.world.mode === 'menu') this.close();
      }
    });
    this.dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      this.closeOrBack();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !this.dialog.open) {
        event.preventDefault();
        this.pause();
      }
      if (this.world.mode === 'reward' && ['1', '2', '3'].includes(event.key)) {
        const relic = this.world.rewards[Number(event.key) - 1];
        if (relic) this.action(`relic:${relic.id}`);
      }
    });
    document.addEventListener('input', (event) => this.setting(event));
    this.dialog.addEventListener('submit', (event) => {
      if ((event.target as HTMLFormElement).id !== 'run-form') return;
      event.preventDefault();
      const seed = document.querySelector<HTMLInputElement>('#seed')!.value;
      this.close();
      this.world.start(seed, this.runWeapon);
      this.update();
    });
    if (this.world.debug) this.addDebug();
    this.update();
  }

  private randomSeed(): string {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    return `CANDLE-${bytes[0].toString(36).toUpperCase().slice(0, 7)}`;
  }
  private action(action: string): void {
    const w = this.world;
    w.audio.play('ui');
    if (action.startsWith('weapon:')) {
      this.runWeapon = action.split(':')[1];
      this.dialog.querySelectorAll<HTMLElement>('.weapon-choice').forEach((b) => {
        b.classList.toggle('selected', b.dataset.action === action);
        b.setAttribute('aria-pressed', String(b.dataset.action === action));
      });
      return;
    }
    if (action.startsWith('relic:')) {
      w.chooseRelic(action.split(':')[1]);
      this.close();
      this.update();
      return;
    }
    if (action.startsWith('unlock:')) {
      const id = action.split(':')[1],
        price = id === 'twins' ? 4 : id === 'spear' ? 8 : 12;
      if (w.save.embers >= price && !w.save.unlocks.includes(id)) {
        w.save.embers -= price;
        w.save.unlocks.push(id);
        persist(w.save);
        this.archive();
      }
      return;
    }
    switch (action) {
      case 'new':
      case 'seeded':
        this.runSetup(action === 'seeded');
        break;
      case 'training':
        this.close();
        w.start('THE-PRACTICE', 'sword', true);
        break;
      case 'settings':
        this.settingsBack = this.screen || (w.mode === 'paused' ? 'pause' : 'menu');
        this.settings();
        break;
      case 'controls':
        this.returnMode = w.mode === 'menu' ? 'menu' : 'paused';
        if (w.mode === 'playing') w.pause();
        this.controls();
        break;
      case 'credits':
        this.credits();
        break;
      case 'archive':
        this.archive();
        break;
      case 'pause':
        this.pause();
        break;
      case 'resume':
        this.close();
        if (w.mode === 'paused') w.pause();
        break;
      case 'back':
        this.closeOrBack();
        break;
      case 'menu':
        w.settleRun();
        w.mode = 'menu';
        w.audio.ambience(false, false);
        this.close();
        this.update();
        break;
      case 'restart':
        this.close();
        w.start(w.seed, w.weapon.id, w.training);
        break;
      case 'random':
        this.close();
        w.start(this.randomSeed(), w.weapon.id);
        break;
      case 'reroll': {
        const input = document.querySelector<HTMLInputElement>('#seed');
        if (input) input.value = this.randomSeed();
        break;
      }
      case 'copy':
        void navigator.clipboard
          ?.writeText(w.seed)
          .then(() => this.notify('Seed copied.'))
          .catch(() => this.notify(`Seed: ${w.seed}`));
        break;
      case 'sound': {
        if (w.save.settings.master) {
          this.lastVolume = w.save.settings.master;
          w.save.settings.master = 0;
        } else w.save.settings.master = this.lastVolume || 0.65;
        persist(w.save);
        this.updateSound();
        w.audio.ambience(w.combat, w.mode !== 'playing' && w.mode !== 'menu');
        break;
      }
      case 'fullscreen':
        if (document.fullscreenElement)
          void document.exitFullscreen().catch(() => this.notify('Fullscreen is unavailable.'));
        else
          void document.documentElement
            .requestFullscreen()
            .catch(() => this.notify('Fullscreen is unavailable in this browser.'));
        break;
      case 'reset':
        this.show(
          'reset',
          'Forget the chronicle?',
          `<p class="dialog-copy">This erases discovered relics, weapon unlocks, embers, and settings on this device.</p><div class="dialog-actions"><button class="subtle" data-action="settings">Keep the chronicle</button><button class="danger" data-action="reset-confirm">Erase saved progress</button></div>`,
        );
        break;
      case 'reset-confirm': {
        try {
          localStorage.removeItem(SAVE_KEY);
        } catch {
          /* Continue with an in-memory reset. */
        }
        Object.assign(w.save, defaultSave());
        w.audio.settings = w.save.settings;
        w.mode = 'menu';
        this.close();
        this.update();
        this.notify('The chronicle has been erased.');
        break;
      }
    }
  }

  private show(screen: string, title: string, body: string, wide = false): void {
    this.screen = screen;
    this.dialog.className = wide ? 'wide-dialog' : '';
    this.dialog.innerHTML = `<div class="dialog-topline"><span>HOLLOW CANTICLE</span><button data-action="back" aria-label="Back or close">${icon('close')}</button></div><h2 id="dialog-title">${title}</h2>${body}`;
    if (!this.dialog.open) this.dialog.showModal();
    this.dialog.scrollTop = 0;
  }
  private close(): void {
    this.dialog.close();
    this.screen = '';
  }
  private closeOrBack(): void {
    if (['reward', 'death', 'trained'].includes(this.screen)) return;
    if (this.screen === 'settings' && this.settingsBack === 'pause') {
      this.pauseMenu();
      return;
    }
    if (this.screen === 'reset') {
      this.settings();
      return;
    }
    if (this.world.mode === 'paused') {
      if (this.screen === 'pause') {
        this.close();
        this.world.pause();
      } else this.pauseMenu();
    } else this.close();
  }
  private pause(): void {
    if (this.world.mode === 'menu') {
      this.settingsBack = 'menu';
      this.settings();
      return;
    }
    if (this.world.mode === 'playing') this.world.pause();
    if (this.world.mode === 'paused') this.pauseMenu();
  }
  private pauseMenu(): void {
    const w = this.world;
    this.show(
      'pause',
      'Between two breaths',
      `
      <p class="eyebrow">DEPTH ${String(w.floor.depth).padStart(2, '0')} · ${BIOMES[w.floor.biome].name.toUpperCase()}</p>
      <div class="run-info"><span>Seed</span><button class="seed-copy" data-action="copy">${escape(w.seed)} ${icon('seed', 13)}</button><span>Weapon</span><strong>${w.weapon.name}</strong><span>Relics</span><strong>${w.relics.length}</strong><span>Souls released</span><strong>${w.stats.kills}</strong></div>
      <div class="stack-buttons"><button class="primary" data-action="resume">Resume the descent ${icon('arrow')}</button><button data-action="settings">Settings</button><button data-action="controls">Field guide</button><button data-action="restart">Replay this seed</button><button class="subtle" data-action="menu">End run & return to the threshold</button></div>`,
    );
  }

  private runSetup(seeded = false): void {
    this.runWeapon = this.world.weapon.id;
    const w = this.world;
    this.show(
      'run',
      'Light another candle',
      `
      <p class="dialog-copy">Choose the steel that will keep your oath.</p>
      <form id="run-form"><div class="weapon-grid">${WEAPONS.map((weapon, i) => {
        const locked = i > 0 && !w.save.unlocks.includes(weapon.id);
        return `<button type="button" class="weapon-choice ${this.runWeapon === weapon.id ? 'selected' : ''}" data-action="weapon:${weapon.id}" aria-pressed="${this.runWeapon === weapon.id}" ${locked ? 'disabled' : ''}><span class="weapon-symbol">${icon('sword', 28)}</span><span class="eyebrow">${weapon.subtitle}</span><strong>${weapon.name}</strong><span>${locked ? `Unlock in the Chronicle · ${i === 1 ? 4 : i === 2 ? 8 : 12} embers` : weapon.description}</span></button>`;
      }).join(
        '',
      )}</div><label class="seed-label" for="seed">RUN SEED <span>The same seed, the same descent.</span></label><div class="seed-input"><input id="seed" name="seed" value="${escape(this.randomSeed())}" maxlength="40" pattern="[a-zA-Z0-9 _-]+" title="Use letters, numbers, spaces, underscores, or hyphens" required autocomplete="off" spellcheck="false"/><button type="button" data-action="reroll" title="Generate another seed" aria-label="Generate another seed">↻</button></div><p class="hint">${w.save.tutorial ? 'Each chamber is a choice. Each defeat leaves embers for new starting weapons.' : 'New to the descent? Learn the rhythm from the main menu. Training is safe.'}</p><button type="submit" class="primary full">Light the candle ${icon('arrow')}</button></form>`,
      true,
    );
    if (seeded) this.dialog.querySelector<HTMLInputElement>('#seed')?.select();
  }

  private settings(): void {
    const s = this.world.save.settings;
    const range = (key: 'master' | 'music' | 'sfx', label: string) =>
      `<label class="range-row" for="setting-${key}"><span>${label}</span><input id="setting-${key}" data-setting="${key}" type="range" min="0" max="100" value="${Math.round(s[key] * 100)}"/><output>${Math.round(s[key] * 100)}%</output></label>`;
    const toggle = (
      key: 'shake' | 'flashes' | 'assist' | 'reducedMotion' | 'quality',
      label: string,
      help: string,
    ) =>
      `<label class="toggle-row"><span>${label}<small>${help}</small></span><input data-setting="${key}" type="checkbox" ${s[key] ? 'checked' : ''}/></label>`;
    this.show(
      'settings',
      'Tune the silence',
      `<p class="eyebrow">AUDIO</p>${range('master', 'Master volume')}${range('music', 'Ambience')}${range('sfx', 'Steel & effects')}<div class="section-rule"></div><p class="eyebrow">FEEL & ACCESSIBILITY</p>${toggle('shake', 'Camera shake', 'Small impulses on deflections and impacts.')}${toggle('flashes', 'Impact flashes', 'Brief warm flashes on perfect parries.')}${toggle('reducedMotion', 'Reduced motion', 'Calmer camera transitions and shorter hit stops.')}${toggle('assist', 'Parry assistance', 'More generous normal and perfect timing windows.')}${toggle('quality', 'Atmospheric effects', 'Fog, floating dust, and extra ambient detail.')}<div class="dialog-actions"><button class="subtle" data-action="reset">Reset saved progress</button><button class="primary" data-action="back">Done ${icon('chevron')}</button></div>`,
    );
  }
  private setting(event: Event): void {
    const input = event.target as HTMLInputElement;
    const key = input.dataset.setting;
    const s = this.world.save.settings;
    if (key === 'master' || key === 'music' || key === 'sfx') {
      s[key] = Math.max(0, Math.min(1, Number(input.value) / 100));
      input.parentElement!.querySelector('output')!.value = `${input.value}%`;
    } else if (
      key === 'shake' ||
      key === 'flashes' ||
      key === 'assist' ||
      key === 'reducedMotion' ||
      key === 'quality'
    )
      s[key] = input.checked;
    else return;
    if (!persist(this.world.save))
      this.notify('Browser storage is unavailable. Settings apply for this session.');
    this.updateSound();
    this.world.audio.ambience(
      this.world.combat,
      this.world.mode !== 'playing' && this.world.mode !== 'menu',
    );
  }

  private controls(): void {
    this.show(
      'controls',
      'The practice of steel',
      `<p class="dialog-copy">Your enemy’s guard is a second life. Deflect, apply pressure, then end the duel before it recovers.</p><div class="guide-grid"><div><p class="eyebrow">YOUR HANDS</p><dl class="controls-list"><dt>W A S D / Arrows</dt><dd>Move</dd><dt>Mouse</dt><dd>Aim & soft target</dd><dt>J / Left mouse</dt><dd>Strike / counter</dd><dt>K / Right mouse</dt><dd>Deflect</dd><dt>Space</dt><dd>Evade / dodge</dd><dt>E</dt><dd>Interact / finisher</dd><dt>Q</dt><dd>Resonance at 100 Focus</dd><dt>Esc</dt><dd>Pause</dd></dl></div><div><p class="eyebrow">READ THE BLADE</p><div class="guide-tip"><b>Meet steel with steel.</b><p>Tap deflect as a normal strike lands. The final instant creates a perfect deflection: a silver note, golden sparks, and heavy guard damage.</p></div><div class="guide-tip"><b>Leave the red arc.</b><p>Sweeps, grabs, and heavy smashes require an evade. A greatblade can perfectly deflect a smash.</p></div><div class="guide-tip"><b>Answer every opening.</b><p>Strike immediately after a deflection to counter. Attacking keeps enemy guard from recovering. When it breaks, approach and press E.</p></div></div></div><p class="hint">Gold bar: enemy guard. Red bar: vitality. Your blue line is Focus. Each third depth holds a guardian with two phases.</p><div class="dialog-actions"><button class="subtle" data-action="back">Back</button>${this.returnMode === 'menu' ? '<button class="primary" data-action="training">Enter safe training</button>' : '<button class="primary" data-action="resume">Return to the descent</button>'}</div>`,
      true,
    );
  }

  private archive(): void {
    const w = this.world;
    this.show(
      'archive',
      'The chronicle',
      `<p class="dialog-copy">What survives the dark becomes part of your next oath.</p><div class="archive-stats"><span><b>${w.save.embers}</b> EMBERS</span><span><b>${w.save.bestDepth}</b> DEEPEST DESCENT</span><span><b>${w.save.runs}</b> OATHS TAKEN</span><span><b>${w.save.relics.length} / ${RELICS.length}</b> RELICS FOUND</span></div><p class="eyebrow">NEW STARTING POSSIBILITIES</p><div class="unlock-list">${WEAPONS.slice(
        1,
      )
        .map((weapon, i) => {
          const cost = [4, 8, 12][i],
            unlocked = w.save.unlocks.includes(weapon.id);
          return `<div><span>${icon('sword', 24)}</span><div><strong>${weapon.name}</strong><p>${weapon.description}</p></div><button data-action="unlock:${weapon.id}" ${unlocked || w.save.embers < cost ? 'disabled' : ''}>${unlocked ? 'UNLOCKED' : `${cost} EMBERS`}</button></div>`;
        })
        .join(
          '',
        )}</div><div class="section-rule"></div><p class="eyebrow">RELICS REMEMBERED</p><div class="relic-index">${RELICS.map(
        (r) => {
          const known = w.save.relics.includes(r.id);
          return `<div class="${known ? '' : 'undiscovered'}"><span>${known ? r.glyph : '◇'}</span><p><strong>${known ? r.name : 'Undiscovered'}</strong><small>${known ? r.description : 'An echo waiting in the dark.'}</small></p></div>`;
        },
      ).join(
        '',
      )}</div><div class="dialog-actions"><span class="hint">Embers are kept when a run ends.</span><button class="primary" data-action="back">Return</button></div>`,
      true,
    );
  }
  private credits(): void {
    this.show(
      'credits',
      'An original requiem',
      `<p class="dialog-copy">Hollow Canticle is a small game about the moment before two blades meet.</p><div class="credits-text"><p>All dungeon artwork, characters, decorations, particles, and audio are generated by the game. The supplied concept was used as a reference for mood and composition.</p><p>Made with TypeScript, Phaser 4, Vite, Canvas 2D, and WebAudio. No backend. No accounts. No analytics.</p><p>Inspired by the craft of precision combat. An original world, with no affiliation to other games.</p><p class="eyebrow">VERSION 0.1.0 · CODE & ORIGINAL ASSETS: MIT</p></div><button class="primary full" data-action="back">Return to the threshold</button>`,
    );
  }

  private rewards(): void {
    const w = this.world;
    this.show(
      'reward',
      'An echo answers',
      `<p class="dialog-copy">Choose one relic. Its memory stays with this descent.</p><div class="reward-grid">${w.rewards.map((r, i) => `<button class="relic-choice" data-action="relic:${r.id}"><span class="relic-key">0${i + 1}</span><span class="relic-art">${r.glyph}</span><span class="eyebrow rarity-${r.rarity.toLowerCase()}">${r.rarity.toUpperCase()} RELIC</span><strong>${r.name}</strong><span class="relic-description">${r.description}</span><span class="choose-label">TAKE THIS ECHO ${icon('arrow', 16)}</span></button>`).join('')}</div><p class="hint center">Use 1, 2, or 3 to choose. Relics change the rules; combine their effects.</p>`,
      true,
    );
    this.dialog.querySelector('.dialog-topline button')?.remove();
  }
  private summary(): void {
    const w = this.world,
      s = w.stats;
    const duration = `${Math.floor(s.time / 60)}m ${Math.floor(s.time % 60)}s`;
    this.show(
      'death',
      'The candle goes out',
      `<p class="dialog-copy">The dark keeps your footsteps. Your next oath begins here.</p><div class="death-depth">${String(w.floor.depth).padStart(2, '0')}<span>DEPTH REACHED</span></div><div class="summary-grid">${[
        ['Souls released', s.kills],
        ['Chambers cleared', s.rooms],
        ['Deflections', s.parries],
        ['Perfect deflections', s.perfects],
        ['Best perfect streak', s.bestStreak],
        ['Final tolls', s.finishers],
        ['Damage taken', Math.round(s.damage)],
        ['Time below', duration],
      ]
        .map(([a, b]) => `<div><span>${a}</span><strong>${b}</strong></div>`)
        .join(
          '',
        )}</div><p class="hint">${w.weapon.name} · ${w.relics.length} relics · ${s.kills + s.rooms * 2 + s.bosses * 10} embers kept</p><p class="seed-summary">${escape(w.seed)} <button data-action="copy" aria-label="Copy run seed">${icon('seed', 13)}</button></p><div class="stack-buttons"><button class="primary" data-action="random">Take another oath ${icon('arrow')}</button><button data-action="restart">Replay this seed</button><button class="subtle" data-action="menu">Return to the threshold</button></div>`,
    );
    this.dialog.querySelector('.dialog-topline button')?.remove();
  }

  update(): void {
    const w = this.world;
    if (this.lastMode !== w.mode) {
      this.menu.hidden = w.mode !== 'menu';
      document.body.classList.toggle('in-game', w.mode !== 'menu');
      if (w.mode === 'paused' && !this.dialog.open) this.pauseMenu();
      this.lastMode = w.mode;
    }
    for (const event of w.events.splice(0)) {
      if (event.type === 'reward') this.rewards();
      if (event.type === 'death') this.summary();
      if (event.type === 'trained') {
        this.show(
          'trained',
          'The oath is yours',
          `<div class="training-sigil">${sigil}</div><p class="dialog-copy center">You have learned the rhythm.<br>The real descent offers no such mercy.</p><div class="stack-buttons"><button class="primary" data-action="new">Begin the descent ${icon('arrow')}</button><button class="subtle" data-action="menu">Return to the threshold</button></div>`,
        );
        this.dialog.querySelector('.dialog-topline button')?.remove();
      }
    }
    const biome = BIOMES[w.floor.biome];
    document.querySelector('#location-label')!.textContent =
      `${String(w.floor.depth).padStart(2, '0')} / ${biome.name.toUpperCase()}`;
    document.querySelector('#location-sub')!.textContent =
      w.floor.hybrid === null
        ? biome.label
        : `MUTATION · ${BIOMES[w.floor.hybrid].short.toUpperCase()}`;
    const status = w.toast && w.toast.until > w.time ? w.toast.text : '';
    if (status && status !== this.lastStatus) {
      this.notify(`${status}. ${w.toast!.sub}`);
      this.lastStatus = status;
    }
    this.updateSound();
    const debugState = document.querySelector('#debug-state');
    if (debugState) {
      const e = w.target;
      debugState.textContent = `Time ${w.time.toFixed(2)} · HP ${Math.round(w.player.hp)} · ${w.player.state}\nParries ${w.stats.parries} / Perfect ${w.stats.perfects}\n${e ? `${e.def.id}: ${e.state} ${Math.max(0, w.time - e.stateAt).toFixed(2)} / ${e.strike.windup.toFixed(2)} ${e.strike.kind}` : 'No opponent'}`;
    }
  }
  private updateSound(): void {
    const muted = this.world.save.settings.master === 0;
    if (this.lastMute === muted) return;
    this.lastMute = muted;
    const button = document.querySelector('[data-action="sound"]')!;
    button.innerHTML = icon(this.world.save.settings.master ? 'sound' : 'mute');
    button.setAttribute(
      'aria-label',
      this.world.save.settings.master ? 'Mute audio' : 'Unmute audio',
    );
  }
  private notify(message: string): void {
    document.querySelector('#live-status')!.textContent = message;
  }

  private addDebug(): void {
    const panel = document.createElement('details');
    panel.className = 'debug-panel';
    panel.innerHTML = `<summary>QA tools</summary><label>Invincible <input type="checkbox" id="debug-god"/></label><label>Enemy <select id="debug-enemy">${ENEMIES.map((e) => `<option value="${e.id}">${e.name}</option>`).join('')}</select></label><button id="debug-spawn">Spawn encounter</button><label>Weapon <select id="debug-weapon">${WEAPONS.map((w) => `<option value="${w.id}">${w.name}</option>`).join('')}</select></label><label>Depth <input id="debug-depth" type="number" min="1" max="10000" value="1"/></label><button id="debug-jump">Jump depth</button><button id="debug-heal">Restore vitality / Focus</button><button id="debug-loot">Open relic choice</button><button id="debug-break">Break nearest guard</button><label>Relic <select id="debug-relic">${RELICS.map((r) => `<option value="${r.id}">${r.name}</option>`).join('')}</select></label><button id="debug-add">Add relic</button>`;
    document.body.append(panel);
    const w = this.world;
    panel.insertAdjacentHTML(
      'beforeend',
      `<label>Time scale <select id="debug-speed"><option value="1">Normal</option><option value="0.25">Quarter speed</option><option value="0.1">Tenth speed</option></select></label><button id="debug-range">Stand in duel range</button><label>Chamber <select id="debug-modifier">${['Quiet', 'Darkness', 'Resonant', 'Blood pact', 'Unstable', 'Silence'].map((m) => `<option>${m}</option>`).join('')}</select></label><pre id="debug-state"></pre>`,
    );
    panel
      .querySelector('#debug-speed')!
      .addEventListener(
        'change',
        (e) => (w.timeScale = Number((e.target as HTMLSelectElement).value)),
      );
    panel.querySelector('#debug-range')!.addEventListener('click', () => {
      const e = w.target;
      if (e) {
        w.player.x = e.x - 85;
        w.player.y = e.y;
      }
    });
    panel
      .querySelector('#debug-modifier')!
      .addEventListener(
        'change',
        (e) => (w.room.modifier = (e.target as HTMLSelectElement).value as typeof w.room.modifier),
      );
    panel
      .querySelector('#debug-god')!
      .addEventListener('change', (e) => (w.invincible = (e.target as HTMLInputElement).checked));
    panel.querySelector('#debug-weapon')!.addEventListener('change', (e) => {
      w.weapon = WEAPONS.find((x) => x.id === (e.target as HTMLSelectElement).value)!;
    });
    panel.querySelector('#debug-heal')!.addEventListener('click', () => {
      w.player.hp = 100;
      w.player.focus = 100;
    });
    panel.querySelector('#debug-spawn')!.addEventListener('click', () => {
      this.close();
      w.mode = 'playing';
      w.enemies = [
        w.spawnEnemy((panel.querySelector('#debug-enemy') as HTMLSelectElement).value, 0),
      ];
      w.room.cleared = false;
      w.clearAt = 0;
    });
    panel.querySelector('#debug-jump')!.addEventListener('click', () => {
      const depth = Number((panel.querySelector('#debug-depth') as HTMLInputElement).value);
      if (Number.isFinite(depth) && depth >= 1) {
        w.floor = makeFloor(w.seed, Math.floor(Math.min(10000, depth)));
        w.enterRoom(0);
        w.obstacles = obstaclesFor(w.room, w.floor.biome);
      }
    });
    panel.querySelector('#debug-loot')!.addEventListener('click', () => w.openReward());
    panel.querySelector('#debug-break')!.addEventListener('click', () => {
      const target = w.target;
      if (target) w.pressure(target, 1000);
    });
    panel.querySelector('#debug-add')!.addEventListener('click', () => {
      const relic = RELICS.find(
        (r) => r.id === (panel.querySelector('#debug-relic') as HTMLSelectElement).value,
      )!;
      if (!w.relics.includes(relic)) w.relics.push(relic);
    });
  }
}
