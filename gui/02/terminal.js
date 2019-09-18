const Terminal = (() => {
	const style = document.createElement('style');
	style.setAttribute('type', 'text/css');
	style.innerText = '.t_container { width: 100%; height: 100%; margin: 0; }'
			+ ' .t_input { position: absolute; top: 0; left: 0; width: 0; height: 0;'
			+ ' margin: 0; border: 0; padding: 0; }'
			+ ' .t_output { font-family: "Lucida Console", monospace; font-size: 16px;'
			+ ' width: calc(100% - 14px); height: calc(100% - 14px);'
			+ ' margin: 4px; border: 1px; padding: 2px; border-radius: 4px;'
			+ ' outline: none; resize: none; white-space: break-spaces; word-break: break-all; }'
	document.head.appendChild(style);

	function assert_type(value, expected, name, regex) {
		if (typeof expected == 'string') {
			if (typeof value == expected && (!regex || regex.test(value)))
				return;
		} else
			if (value instanceof expected)
				return;

		throw new Error('Bad ' + name + ' argument: ' + value);
	}

	const theme_name_regex = /^[0-9a-z_]+$/;
	const theme_color_regex = /^[0-9a-f]{6}$/;

	const default_line_prompt = '> ';
	const default_cursor_rate = 450;

	return class Terminal {

		static add_theme(name, background, foreground) {
			assert_type(name, 'string', 'name', theme_name_regex);
			assert_type(background, 'string', 'background', theme_color_regex);
			assert_type(foreground, 'string', 'foreground', theme_color_regex);

			style.innerText += ' .t_theme_' + name + ' .t_output {'
				+ ' background-color: #' + background + ';'
				+ ' color: #' + foreground + ';'
				+ ' border: 1px #' + foreground + ' solid; }';
		}

		constructor(container, has_history) {
			assert_type(container, Element, 'container');
			if (has_history)
				assert_type(has_history, 'boolean', 'has history');

			container.setAttribute('class', 't_container');
			container.innerText = '';

			const input = document.createElement('input');
			input.setAttribute('type', 'text');
			input.setAttribute('class', 't_input');
			input.setAttribute('autocomplete', 'off');
			input.setAttribute('autocorect', 'off');
			input.setAttribute('autocapitalize', 'off');
			input.setAttribute('spellcheck', 'false');
			container.appendChild(input);

			const output = document.createElement('textarea');
			output.setAttribute('readonly', 'readonly');
			output.setAttribute('class', 't_output');
			container.appendChild(output);

			this._container = container;
			this._output = output;
			this._input = input;

			this._line_prompt = default_line_prompt;
			this._cursor_rate = default_cursor_rate;

			this._line_prompting = false;
			this._line_resolver = null;

			this._cursor_focused = false;
			this._cursor_blinked = false;
			this._cursor_interval = 0;

			this._history_position = 0;
			this._history = has_history ? [] : null;

			this._output_text = '';

			let clicked = false;

			output.addEventListener('mousedown', event => { clicked = true; });
			output.addEventListener('mousemove', event => { if (output.selectionEnd
				- output.selectionStart > 0) clicked = false; });
			output.addEventListener('mouseup', event => { if (output.selectionEnd
				- output.selectionStart > 0) clicked = false; });
			output.addEventListener('mouseup', event => { if (output.selectionEnd
				- output.selectionStart == 0 && clicked) input.focus(); });

			input.addEventListener('focus', event => this._set_cursor_focus(true));
			input.addEventListener('blur', event => this._set_cursor_focus(false));
			input.addEventListener('input', event => this._update_cursor_focus(true));

			input.addEventListener('keydown', event => {
				if (!this._line_prompting) {
					event.preventDefault();
					return;
				}

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
						if (!this._history)
							break;

			      if (this._history_position > 0) {
			        this._history_position--;
							input.value = this._history[this._history_position];
							input.selectionStart = input.value.length;
			      }
			      break;
			    case 'ArrowDown':
						if (!this._history)
							break;

			      if (this._history_position < this._history.length - 1) {
			        this._history_position++;
							input.value = this._history[this._history_position];
							input.selectionStart = input.value.length;
			      }
			      break;
			    case 'Enter':
						if (this._history)
							this._history.push(input.value);

						this._set_line_prompting(false);
						this._line_resolver(input.value);
			      break;
			    default:
			      if (event.ctrlKey)
			        event.preventDefault();
			      return;
			  }

			  input.selectionEnd = input.selectionStart;
			  this._update_cursor_focus();

			  event.preventDefault();
			});
		}

		_update_output() {
		  this._output.value = this._output_text;
			if (this._line_prompting) {
				this._output.value += this._line_prompt;

				if (this._input.selectionStart == this._input.value.length)
					this._output.value += this._input.value + (this._cursor_blinked ? '\u2588' : '\xA0\u200B');
				else
					this._output.value += this._cursor_blinked
						? this._input.value.substring(0, this._input.selectionStart)
						+ '\u2588'
						+ this._input.value.substring(this._input.selectionStart + 1)
						: this._input.value;
			}

		  this._output.scrollTop = this._output.scrollHeight;
		}

		_set_cursor_focus(new_cursor_focus) {
			this._cursor_focused = new_cursor_focus;

			if (!this._line_prompting)
				return;

			clearInterval(this._cursor_interval);
			this._cursor_interval = 0;

			if (!this._cursor_focused) {
				this._cursor_blinked = false;
				this._update_output();

				return;
			}

			this._cursor_blinked = true;

			if (this._line_prompting) {
				this._update_output();
				this._cursor_interval = setInterval(() => { terminal._cursor_blinked
					= !terminal._cursor_blinked; terminal._update_output(); },
					this._cursor_rate);
			}
		}

		_update_cursor_focus() {
			this._set_cursor_focus(this._cursor_focused);
		}

		_set_line_prompting(new_line_prompting) {
				this._line_prompting = new_line_prompting;
				this._update_cursor_focus();
				this._update_output();
		}

		set_theme(name) {
			assert_type(name, 'string', 'name', theme_name_regex);

			this._container.setAttribute('class', 't_container t_theme_' + name);
		}

		set_line_prompt(new_line_prompt) {
			assert_type(new_line_prompt, 'string', 'new line prompt');

			this._line_prompt = new_line_prompt;
			this._update_output();
		}

		set_cursor_rate(new_cursor_rate) {
			assert_type(new_cursor_rate, 'number', 'new cursor rate');

			this._cursor_rate = new_cursor_rate;
			this._update_cursor_focus();
			this._update_output();
		}

		is_line_prompting() {
			return this._line_prompting;
		}

		prompt_line() {
			if (this._line_prompting)
				throw new Error("Line is already prompting");

			this._history_position = this._history ? this._history.length : 0;
			this._input.value = '';

			this._set_line_prompting(true);
			return new Promise(resolver => this._line_resolver = resolver);
		}

		write_line(message) {
			assert_type(message, 'string', 'message');
			this._output_text += message + '\r\n';
			this._update_output();
		}
	}
})();
