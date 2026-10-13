# Задание для Codex: изображения сайта

## Роль и задача
Ты — арт-директор и фотограф премиальной e-commerce-съёмки для интернет-магазина корейской косметики и натуральных трав «K-Beauty | C-Health» (Казахстан, г. Костанай).

**Основные фото уже сделаны** (список — в разделе 4). **Сейчас нужно** сгенерировать **дополнительные ракурсы** для галереи каждого товара: 40 фото, по два на каждый товар (раздел 2). Сохраняй каждое **точно по указанному пути и с указанным именем**. Сайт сам находит эти файлы и показывает их в галерее товара; пока файла нет, лишняя миниатюра просто не показывается.

- Корень проекта: `site/`
- Референсы стиля: `references/*.png` и уже готовые фото в `site/demo/images/products/`. Новые ракурсы должны выглядеть как **та же фотосессия**: тот же товар, тот же свет, фон и цвет.
- **Не меняй** HTML, CSS и JS — только создавай файлы изображений.

## Где лежат картинки
```
site/demo/images/
└─ products/            фото демо-товаров по разделам каталога (удаляются вместе с папкой demo)
│  ├─ face/             уход за лицом
│  ├─ hair/             волосы
│  ├─ makeup/           декоративная косметика
│  ├─ body/             уход за телом
│  ├─ herbs/            травы и сборы
   └─ sets/             наборы

site/assets/images/
├─ products/            сюда владелец кладёт фото настоящих товаров
├─ pages/               фото страниц
│  ├─ home/             главная
│  ├─ about/            «О нас»
│  ├─ delivery/         «Доставка и оплата»
│  └─ login/            вход
├─ common/              общие картинки (превью ссылки, «пусто»)
└─ decor/               декоративные ветки (PNG с прозрачным фоном)
```
Правило имён фото товара: `название.jpg` — главное фото, `название-2.jpg`, `название-3.jpg` — дополнительные ракурсы.

## Единый стиль (применяй к каждому изображению)
```
Premium Korean skincare & herbal apothecary e-commerce photography.
Warm cream-beige background (#F3EFE6), natural beige travertine stones, fresh green eucalyptus,
olive and heartleaf leaves, small white jasmine flowers. Soft diffused morning daylight from the left,
gentle natural shadows, shallow depth of field. Muted natural palette with deep forest-green accents (#1F3A2D).
Calm, clean, airy, photorealistic, high detail. No text overlays, no watermarks, no UI elements,
no hearts/badges/buttons.
```

## Технические требования
- Фото товаров: **JPG 1200×1200**, sRGB, качество 85, до 400 КБ.
- Упаковка должна быть **та же, что на главном фото товара** (цвет, форма, логотип). Открой главное фото перед генерацией.
- Если генератор искажает текст на этикетке, снимай ракурс, где этикетка видна частично или не видна вовсе.
- Руки — женские, с естественным маникюром, без колец и украшений.

---

## 1. Как снимать ракурсы
| Файл | Что показываем |
|---|---|
| `…-2.jpg` | **Текстура или содержимое:** капля, мазок, пена, сухие травы крупным планом — то, как средство выглядит «внутри» |
| `…-3.jpg` | **В использовании или в руке:** средство в руке, на коже, заваренный чай — масштаб и ощущение от продукта |

---

## 2. Нужно сгенерировать: дополнительные ракурсы (40 фото, 1200×1200 JPG)

### Уход за лицом — `site/demo/images/products/face/`
| Файл | Что в кадре |
|---|---|
| `boj-dynasty-cream-2.jpg` | Open frosted jar from above, thick white cream with a smooth swirl on top, lid leaning beside, jasmine flowers |
| `boj-dynasty-cream-3.jpg` | Woman's fingertip with a dollop of the cream next to the open jar, travertine stone, soft light |
| `roundlab-dokdo-cleanser-2.jpg` | Rich white foam in an open palm (no face), blue-white tube blurred behind |
| `roundlab-dokdo-cleanser-3.jpg` | Tube lying on wet river stones with water droplets, light-blue reflections |
| `torriden-serum-2.jpg` | Glass dropper releasing a clear gel drop, macro, aqua-blue bottle blurred behind |
| `torriden-serum-3.jpg` | Hand holding the aqua dropper bottle against cream background, thyme sprigs |
| `cosrx-snail-96-2.jpg` | Macro of the clear, slightly stretchy essence between two fingertips |
| `cosrx-snail-96-3.jpg` | Bottle with black pump next to a glass dish with a pool of essence, leaves |
| `medipeel-glutathione-2.jpg` | Golden-cream dropper ampoule with a drop falling, macro, lavender sprigs |
| `medipeel-glutathione-3.jpg` | Ampoule held in hand, drop on the back of the hand |

### Волосы — `site/demo/images/products/hair/`
| Файл | Что в кадре |
|---|---|
| `mise-en-scene-serum-2.jpg` | Golden hair oil drops on a glass surface, macro, warm light |
| `mise-en-scene-serum-3.jpg` | Glossy smooth hair ends (no face) with the bottle and a wooden comb beside |

### Декоративная косметика — `site/demo/images/products/makeup/`
| Файл | Что в кадре |
|---|---|
| `romand-juicy-tint-2.jpg` | Tint swatches on the inside of a wrist, glossy, the tube beside |
| `romand-juicy-tint-3.jpg` | Open tint with the applicator, glossy drop on the tip, flowers |
| `clio-mesh-cushion-2.jpg` | Open cushion compact from above: mesh, puff and mirror, refill pan beside |
| `clio-mesh-cushion-3.jpg` | Puff with foundation texture, swatch on the back of the hand |
| `etude-curl-mascara-2.jpg` | Mascara wand macro with a curved brush, black formula |
| `etude-curl-mascara-3.jpg` | Close-up of curled lashes (eye only, natural makeup) with the tube in soft focus |

### Уход за телом — `site/demo/images/products/body/`
| Файл | Что в кадре |
|---|---|
| `illiyoon-body-lotion-2.jpg` | Pump dispensing white lotion into a palm, macro |
| `illiyoon-body-lotion-3.jpg` | Lotion bottle on a bathroom shelf with a folded towel and eucalyptus |
| `illiyoon-top-to-toe-wash-2.jpg` | Soft white foam on a natural sponge |
| `illiyoon-top-to-toe-wash-3.jpg` | Bottle beside a calm bathtub edge, towel and eucalyptus |
| `happybath-body-wash-2.jpg` | Pearl-like gel stream from the pump, macro |
| `happybath-body-wash-3.jpg` | Large bottle in a shower corner with steam, plants, towel |

### Травы и сборы — `site/demo/images/products/herbs/`
| Файл | Что в кадре |
|---|---|
| `herb-immunity-2.jpg` | Dried rosehip, echinacea and calendula in a wooden bowl, top view, close-up |
| `herb-immunity-3.jpg` | Glass cup of amber rosehip tea with a spoon of honey, the pouch blurred behind |
| `herb-thyme-2.jpg` | Dried thyme close-up on a linen napkin |
| `herb-thyme-3.jpg` | Cup of black tea with a thyme sprig, steam |
| `herb-chamomile-2.jpg` | Whole dried chamomile flowers in a ceramic bowl, macro |
| `herb-chamomile-3.jpg` | Glass teapot with golden chamomile tea, evening warm light |
| `herb-digestion-2.jpg` | Mix of dried mint, fennel seeds and yarrow, top view |
| `herb-digestion-3.jpg` | Cup of light green mint tea with fresh mint leaves |
| `herb-womens-2.jpg` | Dried raspberry leaves, nettle and calendula petals close-up |
| `herb-womens-3.jpg` | Cup of herbal tea with pink and orange petals on the saucer |
| `herb-calm-2.jpg` | Dried lavender, lemon balm and valerian close-up |
| `herb-calm-3.jpg` | Evening scene: cup of tea, lavender bunch, open book, warm lamp light |

### Наборы — `site/demo/images/products/sets/`
| Файл | Что в кадре |
|---|---|
| `set-glow-2.jpg` | Flat lay of the three products from the set out of the box: toner, aqua serum, cream jar |
| `set-glow-3.jpg` | Closed gift box tied with kraft ribbon and a eucalyptus sprig |
| `set-herbal-2.jpg` | Flat lay of three small kraft pouches with a blank card and dried flowers |
| `set-herbal-3.jpg` | Closed gift box with a ribbon and a glass cup of tea beside |

---

## 3. Готовые основные фото (переделывать не нужно)
Для справки и на случай замены. Размеры и описания — те же, что использовались при первой генерации.

- **Товары:** `products/face/anua-toner.jpg` (+ `-2`…`-5`), `boj-dynasty-cream.jpg`, `roundlab-dokdo-cleanser.jpg`, `torriden-serum.jpg`, `cosrx-snail-96.jpg`, `medipeel-glutathione.jpg`; `products/hair/mise-en-scene-serum.jpg`; `products/makeup/romand-juicy-tint.jpg`, `clio-mesh-cushion.jpg`, `etude-curl-mascara.jpg`; `products/body/illiyoon-body-lotion.jpg`, `illiyoon-top-to-toe-wash.jpg`, `happybath-body-wash.jpg`; `products/herbs/herb-immunity.jpg`, `herb-thyme.jpg`, `herb-chamomile.jpg`, `herb-digestion.jpg`, `herb-womens.jpg`, `herb-calm.jpg`; `products/sets/set-glow.jpg`, `set-herbal.jpg`.
- **Главная** (`pages/home/`): `hero.jpg` 2600×1700, `cream-texture.jpg` 1200×1000, `herbs-leaf.png` 400×400 (прозрачный фон), `categories-bg.jpg` 3840×1280.
- **О нас** (`pages/about/`): `about-shop.jpg` 2000×1500 и фотогалерея «Жизнь магазина» `gallery-1.jpg` … `gallery-6.jpg` 800×880.
- **Доставка** (`pages/delivery/`): `delivery-side.jpg` 1000×1800 (центр кадра пустой — там рукописный текст сайта), `cta-branch.png` 600×400 (прозрачный фон).
- **Вход** (`pages/login/`): `auth-side.jpg` 1600×2160.
- **Общие** (`common/`): `og-image.jpg` 1200×630 — превью ссылки; `empty-state.png` 600×600 (прозрачный фон) — иллюстрация для «Корзина пуста» и «Ничего не найдено».
- **Ветки** (`decor/`, PNG с прозрачным фоном): `branch-top-right.png`, `branch-bottom-right.png`, `branch-left.png`, `branch-right.png`.

---

## Проверка после генерации
1. Все 40 новых файлов лежат по путям из раздела 2. Проверка: `find site/demo/images/products -name "*-[23].jpg" | sort`.
2. Открой несколько страниц товаров, например `site/product.html?slug=romashka` и `site/product.html?slug=torriden-dive-in-serum`. В галерее должно быть 3 миниатюры, а все фото товара — выглядеть как одна фотосессия.
3. Ничего, кроме файлов в `site/demo/images/products/`, не изменено.
