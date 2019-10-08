const Terminal = (() => {
	const style = document.createElement('style');
	style.setAttribute('type', 'text/css');
	style.innerText =
		'.t_container { width: 100%; height: 100%; margin: 0; }'
	+ ' .t_input { position: absolute; top: 0; left: 0; width: 0; height: 0;'
	+ ' margin: 0; border: 0; padding: 0; }'
	+ ' .t_output { font-family: "Lucida Console", monospace; font-size: 16px;'
	+ ' width: calc(100% - 14px); height: calc(100% - 14px);'
	+ ' margin: 4px; border: 1px; padding: 2px; border-radius: 4px;'
	+ ' outline: none; resize: none; white-space: break-spaces; word-break: break-all; }'
	+ ' .t_theme_default { background-color: #000; color: #FFF; border: 1px #FFF solid; }';

	document.head.appendChild(style);

	return class Terminal {

		static add_theme(name, background, foreground) {
			style.innerText +=
						` .t_theme_${name} .t_output { background-color: #${background};`
					+ `color: #${foreground}; border: 1px #${foreground} solid; }`;
		}

		_handle_key(event) {
			if (!this._prompting)
				return event.preventDefault();

			const input = this._input,
				use_history = this._use_history,
				history_index = this._history_index,
				history = this._history;

			switch (event.key) {
				case 'ArrowLeft':
					if (input.selectionStart > 0)
						input.selectionStart--;
					break;
				case 'ArrowRight':
					if (input.selectionStart < input.value.length)
						input.selectionStart++;
					break;
				case 'ArrowUp':
					if (!use_history)
						break;

					if (history_index > 0) {
						history_index--;
						input.value = history[history_index];
						input.selectionStart = input.value.length;
					}
					break;
				case 'ArrowDown':
					if (!use_history)
						break;

					if (history_index < history.length - 1) {
						history_index--;
						input.value = history[history_index];
						input.selectionStart = input.value.length;
					}
					break;
				case 'Enter':
					if (use_history)
						history.push(input.value);

					this._prompting = false;
					this._resolve(input.value);
					break;
				case 'V':
					if (event.ctrlKey)
						return;
				default:
					if (event.ctrlKey)
						event.preventDefault();
					return;
			}

			input.selectionEnd = input.selectionStart;
			this._update_cursor();

			event.preventDefault();
		}

		_update_output() {
			const output = this._output,
				input = this._input,
				blinked = this._blinked;

			output.value = this._text;
			if (this._prompting) {
				output.value += this._prompt;

				if (input.selectionStart == input.value.length)
					output.value += input.value + (blinked ? '\u2588' : '\xA0\u200B');
				else
					output.value += blinked
						? input.value.substring(0, input.selectionStart) + '\u2588'
						+ input.value.substring(input.selectionStart + 1) : input.value;
			}

			output.scrollTop = output.scrollHeight;
		}

		_blink() {
			this._blinked = !this._blinked;
			this._update_output();
		}

		_update_cursor() {
			if (!this._prompting)
				return;

			clearInterval(this._interval);
			this._interval = 0;

			if (!this._focused) {
				this._blinked = false;
				this._update_output();
				return;
			}

			this._blinked = true;
			this._interval = setInterval(this._blink.bind(this), this._delay);
			this._update_output();
		}

		_set_focused(new_focused) {
			this._focused = new_focused;
			this._update_cursor();
		}

		get container() {
			return this._container;
		}

		set container(new_container) {
			const old_container = this._container,
				theme = 't_theme_' + this._theme;

			if (old_container) {
				old_container.classList.remove('t_container', theme);
				old_container.innerText = '';
			}

			if (new_container) {
				new_container.classList.add('t_container', theme);
				new_container.innerText = '';
				new_container.appendChild(this._output);
				new_container.appendChild(this._input);
			}

			this._container = new_container;
		}

		get theme() {
			return this._theme;
		}

		set theme(new_theme) {
			const container = this._container,
				old_theme = `t_theme_${this._theme}`;

			if (container) {
				container.classList.remove(old_theme);
				container.classList.add(`t_theme_${new_theme}`);
			}

			this._theme = new_theme;
		}

		get delay() {
			return this._delay;
		}

		set delay(new_delay) {
			this._delay = new_delay;
			this._update_cursor();
		}

		get prompt() {
			return this._prompt;
		}

		set prompt(new_prompt) {
			this._prompt = new_prompt;
			this._update_output();
		}

		get prompting() {
			return this._prompting;
		}

		get use_history() {
			return this._use_history;
		}

		set use_history(new_use_history) {
			if (this._use_history != new_use_history)
				this._history = new_use_history ? [] : null;
			this._use_history = new_use_history;
		}

		read() {
			if (this._prompting)
				throw new Error("Already prompting");

			this._history_index = this._use_history ? this._history.length : 0;
			this._prompting = true;
			this._input.value = '';
			this._update_cursor();

			return new Promise(resolve => this._resolve = resolve);
		}

		write(text) {
			this._text += text + '\r\n';
			this._update_output();
		}

		constructor(constructor, use_history) {
			const output = document.createElement('textarea'),
						input = document.createElement('input');

			output.setAttribute('readonly', 'readonly');
			output.classList.add('t_output');
			this._output = output;

			input.setAttribute('type', 'text');
			input.setAttribute('autocomplete', 'off');
			input.setAttribute('autocorect', 'off');
			input.setAttribute('autocapitalize', 'off');
			input.setAttribute('spellcheck', 'false');
			input.classList.add('t_input');
			this._input = input;

			this._theme = "default";
			this.container = container;
			this.use_history = use_history;

			this._prompting = false;
			this._prompt = '> ';
			this._delay = 450;

			this._focused = false;
			this._blinked = false;
			this._interval = 0;
			this._resolve = null;

			this._text = '';

			let clicked = false;
			output.addEventListener('mousedown', event => { clicked = true; });
			output.addEventListener('mousemove', event => (output.selectionEnd
				- output.selectionStart > 0) ? clicked = false : 0);
			output.addEventListener('mouseup', event => (output.selectionEnd
				- output.selectionStart == 0 && clicked) ? input.focus() : 0);

			input.addEventListener('focus', event => this._set_focused(true));
			input.addEventListener('blur', event => this._set_focused(false));
			input.addEventListener('input', event => this._set_focused(true));
			input.addEventListener('keydown', this._handle_key.bind(this));
		}
	}
})();
