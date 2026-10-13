/* Оформление заказа → демо-оплата картой.
   Это ИМИТАЦИЯ: деньги не списываются, номер карты и CVC никуда не сохраняются —
   в заказ записываются только последние 4 цифры. Для настоящих платежей нужен платёжный сервис и сервер. */
(() => {
  const { ui } = App;

  const digits = (v) => String(v || '').replace(/\D/g, '');

  /** Проверка номера карты по алгоритму Луна (контрольная сумма, как в настоящих формах оплаты). */
  function luhn(number) {
    let sum = 0;
    let double = false;
    for (let i = number.length - 1; i >= 0; i--) {
      let d = +number[i];
      if (double) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
      double = !double;
    }
    return sum % 10 === 0;
  }

  const brand = (number) =>
    /^4/.test(number) ? 'Visa' : /^(5[1-5]|2[2-7])/.test(number) ? 'Mastercard' : /^220[0-4]/.test(number) ? 'Мир' : '';

  /** Поля карты (показываются, когда выбрана оплата картой). */
  const fields = () => `
    <div class="card-form" id="card-form">
      <p class="demo-note">${ui.icon('info')} Демо-оплата: деньги не списываются, данные карты не сохраняются. Для проверки подойдёт номер 4242 4242 4242 4242, любой будущий срок и любой CVC.</p>
      <div class="field">
        <label for="c-card">Номер карты</label>
        <div class="card-number"><input class="input" id="c-card" name="cardNumber" inputmode="numeric" autocomplete="cc-number" placeholder="0000 0000 0000 0000"><span class="card-brand" id="card-brand"></span></div>
        <span class="field-error"></span>
      </div>
      <div class="form-row">
        <div class="field"><label for="c-exp">Срок действия</label><input class="input" id="c-exp" name="cardExp" inputmode="numeric" autocomplete="cc-exp" placeholder="ММ/ГГ"><span class="field-error"></span></div>
        <div class="field"><label for="c-cvc">CVC</label><input class="input" id="c-cvc" name="cardCvc" inputmode="numeric" autocomplete="cc-csc" placeholder="123" maxlength="4" type="password"><span class="field-error"></span></div>
      </div>
    </div>`;

  /** Форматирование при вводе. Возвращает true, если поле относится к карте. */
  function format(el) {
    if (el.name === 'cardNumber') {
      const d = digits(el.value).slice(0, 19);
      el.value = d.replace(/(\d{4})(?=\d)/g, '$1 ');
      const b = document.getElementById('card-brand');
      if (b) b.textContent = brand(d);
      return true;
    }
    if (el.name === 'cardExp') {
      const d = digits(el.value).slice(0, 4);
      el.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
      return true;
    }
    if (el.name === 'cardCvc') {
      el.value = digits(el.value).slice(0, 4);
      return true;
    }
    return false;
  }

  /** Проверка полей карты: { поле: текст ошибки }. */
  function validate(f) {
    const errors = {};
    const number = digits(f.elements.cardNumber.value);
    if (number.length < 13 || !luhn(number)) errors.cardNumber = 'Проверьте номер карты';
    const [mm, yy] = f.elements.cardExp.value.split('/').map(Number);
    const now = new Date();
    const expired =
      !mm || mm > 12 || yy == null || 2000 + yy < now.getFullYear() || (2000 + yy === now.getFullYear() && mm < now.getMonth() + 1);
    if (expired) errors.cardExp = 'Срок указан неверно или карта просрочена';
    if (!/^\d{3,4}$/.test(f.elements.cardCvc.value)) errors.cardCvc = '3 цифры с обратной стороны карты';
    return errors;
  }

  /** Имитация ответа банка. Возвращает последние 4 цифры и платёжную систему. */
  function pay(f) {
    const number = digits(f.elements.cardNumber.value);
    return new Promise((resolve) => setTimeout(() => resolve({ last4: number.slice(-4), brand: brand(number) || 'Карта' }), 1200));
  }

  App.checkoutPayment = { fields, format, validate, pay };
})();
