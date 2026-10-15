import importlib.util
import json
from pathlib import Path

import pytest

SOURCE = Path(__file__).resolve().parents[2] / 'deploy' / 'prepare_frontend.py'


@pytest.fixture
def build(tmp_path, monkeypatch):
    spec = importlib.util.spec_from_file_location('public_build_under_test', SOURCE)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    monkeypatch.setattr(module, 'PROJECT', tmp_path)
    monkeypatch.setattr(module, 'OUTPUT', tmp_path / '.public')
    monkeypatch.setattr(module, 'OWNER', tmp_path / '.public-build.json')
    source = tmp_path / 'frontend'
    source.mkdir()
    (source / 'index.html').write_text('<html>Test</html>', encoding='utf-8')
    return module


@pytest.mark.parametrize('name', ['index.html', '404.html', 'env.js', '.nojekyll', 'pages/cart.html', 'admin/index.html', 'css/main.css', 'js/app.js', 'assets/img/a.webp', 'texts/ru/home.js'])
def test_allow_public_assets(build, name):
    assert build.public_file(Path(name))


@pytest.mark.parametrize('name', ['.env', 'README.md', 'js/app.test.js', 'js/app.spec.js', 'js/app.local.js', 'js/app.stories.js', 'js/secrets/key.js', 'js/.private/key.js', 'js/node_modules/pkg/index.js', 'js/credentials.js', 'assets/backups/a.png', 'tests/example.js', 'assets/database.sql', 'js/service-account.js'])
def test_reject_private_and_test_files(build, name):
    assert not build.public_file(Path(name))


@pytest.mark.parametrize('name', ['demo/data/products.js', 'demo/images/products/a.jpg', 'demo/runtime/auth.js', 'demo/config.json'])
def test_production_never_publishes_optional_extensions(build, name):
    assert not build.public_file(Path(name))


@pytest.mark.parametrize('url', ['https://user:pass@example.com/api', 'https://example.com/api?key=secret', 'https://example.com/api#token', 'ftp://example.com/api', '//example.com/api', 'relative/api'])
def test_invalid_api_url_leaves_existing_output_untouched(build, monkeypatch, url):
    build.OUTPUT.mkdir()
    sentinel = build.OUTPUT / 'keep.txt'
    sentinel.write_text('keep', encoding='utf-8')
    monkeypatch.setenv('TEST_PUBLIC_API_URL', url)
    with pytest.raises(ValueError):
        build.prepare('TEST_PUBLIC_API_URL')
    assert sentinel.read_text(encoding='utf-8') == 'keep'


@pytest.mark.parametrize('url', ['', '/api', 'https://shop.example/api', 'http://localhost:8000/api'])
def test_build_writes_public_api_configuration(build, monkeypatch, url):
    monkeypatch.setenv('TEST_PUBLIC_API_URL', url)
    build.prepare('TEST_PUBLIC_API_URL')
    assert (build.OUTPUT / 'env.js').read_text(encoding='utf-8') == 'window.KBCH_API_URL = ' + json.dumps(url) + ';\n'
    assert json.loads(build.OWNER.read_text(encoding='utf-8')) == build.IDENTITY


def test_build_copies_assets_but_excludes_tests_and_secrets(build):
    source = build.PROJECT / 'frontend'
    for name in ['js/app.js', 'js/app.test.js', 'js/secrets/key.js', 'assets/a.png', '.env']:
        path = source / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(b'fixture')
    assert build.prepare(None) == 3
    assert sorted(p.relative_to(build.OUTPUT).as_posix() for p in build.OUTPUT.rglob('*') if p.is_file()) == ['assets/a.png', 'index.html', 'js/app.js']


def test_unmanaged_output_is_never_replaced(build):
    build.OUTPUT.mkdir()
    sentinel = build.OUTPUT / 'manual.html'
    sentinel.write_text('manual', encoding='utf-8')
    with pytest.raises(ValueError, match='создана не этим скриптом'):
        build.prepare(None)
    assert sentinel.read_text(encoding='utf-8') == 'manual'


def test_second_build_removes_stale_generated_assets(build):
    build.prepare(None)
    (build.OUTPUT / 'old.html').write_text('old', encoding='utf-8')
    (build.PROJECT / 'frontend/index.html').write_text('updated', encoding='utf-8')
    build.prepare(None)
    assert not (build.OUTPUT / 'old.html').exists()
    assert (build.OUTPUT / 'index.html').read_text(encoding='utf-8') == 'updated'


def test_missing_entry_point_fails_without_output(build):
    (build.PROJECT / 'frontend/index.html').unlink()
    with pytest.raises(ValueError, match='index.html'):
        build.prepare(None)
    assert not build.OUTPUT.exists()


def test_styles_are_bundled_into_one_file_with_correct_paths(build):
    css = build.PROJECT / 'frontend' / 'css'
    (css / 'pages').mkdir(parents=True)
    (css / 'main.css').write_text("@import url('base.css?v=1');\n@import url('pages/home.css?v=1');\n", encoding='utf-8')
    (css / 'base.css').write_text('body { color: red; }\n', encoding='utf-8')
    (css / 'pages' / 'home.css').write_text(
        ".hero { background: url('../../assets/bg.jpg') center; }\n.ic { background: url(\"data:image/svg+xml,%3Csvg%3E\"); }\n",
        encoding='utf-8',
    )
    build.prepare(None)
    bundled = (build.OUTPUT / 'css' / 'main.css').read_text(encoding='utf-8')
    assert '@import' not in bundled
    assert bundled.index('color: red') < bundled.index('.hero')
    assert "url('../assets/bg.jpg')" in bundled
    assert 'url("data:image/svg+xml,%3Csvg%3E")' in bundled
