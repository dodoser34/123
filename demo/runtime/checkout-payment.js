(() => {
  const { ui } = App;
  Object.assign(App.texts.checkout.payment, {
    card: { title: 'Картой онлайн', text: 'Visa, Mastercard и другие карты (демо-оплата)' },
    cardOrderTitle: 'Картой онлайн (демо), •••• {last4}',
    demoNote:
      'Демо-оплата: деньги не списываются, данные карты не сохраняются. Для проверки подойдёт номер 4242 4242 4242 4242, любой будущий срок и любой CVC.',
    cardNumber: 'Номер карты',
    cardExp: 'Срок действия',
    cardExpPlaceholder: 'ММ/ГГ',
    cardDefault: 'Карта',
    errorNumber: 'Проверьте номер карты',
    errorExp: 'Срок указан неверно или карта просрочена',
    errorCvc: '3 цифры с обратной стороны карты',
    processing: 'Проводим оплату…'
  });
  App.extensions.paymentMethods = { card: App.texts.checkout.payment.card };
  App.texts.checkout.done.paidCard = 'Оплачено картой {brand} •••• {last4} (демо-оплата).';
  const T = ui.t('checkout.payment');

  const digits = (v) => String(v || '').replace(/\D/g, '');

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

  const fields = () => `
    <div class="card-form" id="card-form">
      <p class="demo-note">${ui.icon('info')} ${T.demoNote}</p>
      <div class="field">
        <label for="c-card">${T.cardNumber}</label>
        <div class="card-number"><input class="input" id="c-card" name="cardNumber" inputmode="numeric" autocomplete="cc-number" placeholder="0000 0000 0000 0000"><span class="card-brand" id="card-brand"></span></div>
        <span class="field-error"></span>
      </div>
      <div class="form-row">
        <div class="field"><label for="c-exp">${T.cardExp}</label><input class="input" id="c-exp" name="cardExp" inputmode="numeric" autocomplete="cc-exp" placeholder="${T.cardExpPlaceholder}"><span class="field-error"></span></div>
        <div class="field"><label for="c-cvc">CVC</label><input class="input" id="c-cvc" name="cardCvc" inputmode="numeric" autocomplete="cc-csc" placeholder="123" maxlength="4" type="password"><span class="field-error"></span></div>
      </div>
    </div>`;

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

  function validate(f) {
    const errors = {};
    const number = digits(f.elements.cardNumber.value);
    if (number.length < 13 || !luhn(number)) errors.cardNumber = T.errorNumber;
    const [mm, yy] = f.elements.cardExp.value.split('/').map(Number);
    const now = new Date();
    const expired =
      !mm || mm > 12 || yy == null || 2000 + yy < now.getFullYear() || (2000 + yy === now.getFullYear() && mm < now.getMonth() + 1);
    if (expired) errors.cardExp = T.errorExp;
    if (!/^\d{3,4}$/.test(f.elements.cardCvc.value)) errors.cardCvc = T.errorCvc;
    return errors;
  }

  function pay(f) {
    const number = digits(f.elements.cardNumber.value);
    return new Promise((resolve) => setTimeout(() => resolve({ last4: number.slice(-4), brand: brand(number) || T.cardDefault }), 1200));
  }

  App.checkoutPayment = { fields, format, validate, pay };
})();
