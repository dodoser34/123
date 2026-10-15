import importlib.util
import json
from pathlib import Path

import pytest

PROJECT = Path(__file__).resolve().parents[2]


@pytest.fixture
def builder(tmp_path, monkeypatch):
    spec = importlib.util.spec_from_file_location('demo_build_test', PROJECT / 'demo/build.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    demo = tmp_path / 'demo'
    demo.mkdir()
    frontend = tmp_path / 'frontend'
    frontend.mkdir()
    (frontend / 'index.html').write_text('Test storefront', encoding='utf-8')
    (frontend / 'env.js').write_text('window.KBCH_API_URL="/api";', encoding='utf-8')
    config = {'storagePrefix': 'kbch.demo.v1.', 'extensions': {'data': ['demo/data/products.js'], 'runtime': [], 'pages': {}, 'styles': []}}
    (demo / 'config.json').write_text(json.dumps(config), encoding='utf-8')
    (demo / 'data').mkdir()
    (demo / 'data/products.js').write_text("App.seed.products=[{images:['demo/images/products/tea.jpg']}];", encoding='utf-8')
    (demo / 'data/orders.js').write_text('App.seed.orders=[];', encoding='utf-8')
    image = demo / 'images/products/tea.jpg'
    image.parent.mkdir(parents=True)
    image.write_bytes(b'nonempty-fixture')
    monkeypatch.setattr(module, 'ROOT', demo)
    monkeypatch.setattr(module, 'FRONTEND', frontend)
    monkeypatch.setattr(module, 'OUTPUT', demo / '.public')
    monkeypatch.setattr(module, 'OWNER', demo / '.public-build.json')
    return module


@pytest.mark.parametrize('name', ['images/products/a.jpg', 'images/a.webp', 'images/a.png', 'data/products.js', 'runtime/auth.js', 'css/ui.css'])
def test_demo_public_assets(builder, name):
    assert builder.public_file(Path(name))


@pytest.mark.parametrize('name', ['images/private/a.jpg', 'images/credentials.jpg', 'images/a.html', 'images/a.js', 'tests/test.js', 'github-pages/action.yml', 'build.py', 'config.json', 'data/example.test.js', 'data/secrets/key.js'])
def test_demo_excludes_private_source_and_tooling(builder, name):
    assert not builder.public_file(Path(name))


def test_demo_build_includes_photos_and_isolates_api_and_storage(builder):
    result = builder.build()
    assert result['productPhotos'] == 1
    assert (builder.OUTPUT / 'demo/images/products/tea.jpg').read_bytes() == b'nonempty-fixture'
    env = (builder.OUTPUT / 'env.js').read_text(encoding='utf-8')
    assert 'KBCH_API_URL = ""' in env and 'kbch.demo.v1.' in env
    assert '/api' not in env
    assert not (builder.OUTPUT / 'demo/config.json').exists()
    assert not (builder.PROJECT / '.public/demo/images/products/tea.jpg').exists()


def test_missing_photo_prevents_replacement_of_good_demo(builder):
    builder.build()
    original = (builder.OUTPUT / 'demo/data/products.js').read_bytes()
    (builder.ROOT / 'images/products/tea.jpg').unlink()
    with pytest.raises(ValueError, match='Не найдено фото демо-товара'):
        builder.build()
    assert (builder.OUTPUT / 'demo/data/products.js').read_bytes() == original
    assert (builder.OUTPUT / 'demo/images/products/tea.jpg').is_file()


def test_demo_build_refuses_unmanaged_output(builder):
    builder.OUTPUT.mkdir()
    sentinel = builder.OUTPUT / 'manual.txt'
    sentinel.write_text('keep', encoding='utf-8')
    with pytest.raises(ValueError, match='создана не этим скриптом'):
        builder.build()
    assert sentinel.read_text(encoding='utf-8') == 'keep'


def test_production_build_works_in_copy_without_demo(tmp_path, monkeypatch):
    import shutil
    source = PROJECT / 'deploy/prepare_frontend.py'
    spec = importlib.util.spec_from_file_location('production_without_demo', source)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    shutil.copytree(PROJECT / 'frontend', tmp_path / 'frontend')
    monkeypatch.setattr(module, 'PROJECT', tmp_path)
    monkeypatch.setattr(module, 'OUTPUT', tmp_path / '.public')
    monkeypatch.setattr(module, 'OWNER', tmp_path / '.public-build.json')
    assert not (tmp_path / 'demo').exists()
    assert module.prepare(None) > 100
    assert not (module.OUTPUT / 'demo').exists()
    env = (module.OUTPUT / 'env.js').read_text(encoding='utf-8')
    assert 'KBCH_EXTENSIONS' not in env and 'kbch.demo' not in env


def test_all_original_catalog_photos_exist():
    spec = importlib.util.spec_from_file_location('demo_photo_audit', PROJECT / 'demo/build.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    assert module.validate_photos(PROJECT) == 65


def test_release_version_changes_when_ui_changes(builder):
    loader = builder.FRONTEND / 'js/app.js'
    loader.parent.mkdir()
    loader.write_text("var VERSION = '1';\n", encoding='utf-8')
    page = builder.FRONTEND / 'index.html'
    page.write_text('<script src="js/app.js?v=1"></script>', encoding='utf-8')
    first = builder.build()['assetVersion']
    assert f'?v={first}' in (builder.OUTPUT / 'index.html').read_text(encoding='utf-8')
    assert first in (builder.OUTPUT / 'js/app.js').read_text(encoding='utf-8')
    loader.write_text("var VERSION = '1';\nconsole.log('changed');", encoding='utf-8')
    second = builder.build()['assetVersion']
    assert second != first
    assert builder.build()['assetVersion'] == second
