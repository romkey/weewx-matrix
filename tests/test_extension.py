"""Validation tests for the weewx-matrix extension."""

import configobj
import glob
import importlib.util
import os
import tempfile
import unittest


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIN = 'Matrix'
SKIN_DIR = os.path.join(ROOT, 'skins', SKIN)


def _load_installer():
    spec = importlib.util.spec_from_file_location('install', os.path.join(ROOT, 'install.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class TestMatrixExtension(unittest.TestCase):
    def test_skin_files_exist(self):
        module = _load_installer()
        paths = module._skin_files()
        self.assertGreater(len(paths), 0)
        for path in paths:
            self.assertTrue(os.path.isfile(os.path.join(ROOT, path)), path)

    def test_cached_installer_has_no_skin_tree(self):
        with tempfile.TemporaryDirectory() as cached_root:
            cached_install = os.path.join(cached_root, 'install.py')
            with open(os.path.join(ROOT, 'install.py'), encoding='utf-8') as src:
                contents = src.read()
            with open(cached_install, 'w', encoding='utf-8') as dst:
                dst.write(contents)

            spec = importlib.util.spec_from_file_location('cached_install', cached_install)
            cached = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(cached)
            self.assertEqual(cached._skin_files(), [])
            cached.loader()  # must not raise when skins/ is absent

    def test_required_fonts_present(self):
        for name in ('ShareTechMono-Regular.ttf', 'VT323-Regular.ttf'):
            path = os.path.join(SKIN_DIR, 'font', name)
            self.assertTrue(os.path.isfile(path), f'missing font: {name}')

    def test_skin_conf_parses(self):
        configobj.ConfigObj(
            os.path.join(SKIN_DIR, 'skin.conf'),
            encoding='utf-8',
            file_error=True,
        )

    def test_language_files_parse(self):
        for path in glob.glob(os.path.join(SKIN_DIR, 'lang', '*.conf')):
            with self.subTest(path=path):
                configobj.ConfigObj(path, encoding='utf-8', file_error=True)

    def test_templates_are_non_empty(self):
        patterns = (
            'index.html.tmpl',
            'history.html.tmpl',
            'archive.html.tmpl',
            'about.html.tmpl',
            'rss.xml.tmpl',
            'archive/month-%Y-%m.html.tmpl',
            'archive/year-%Y.html.tmpl',
        )
        for name in patterns:
            path = os.path.join(SKIN_DIR, name)
            with self.subTest(template=name):
                self.assertTrue(os.path.getsize(path) > 0, name)

    def test_static_assets_exist(self):
        for name in ('matrix.css', 'matrix.js', 'favicon.svg'):
            path = os.path.join(SKIN_DIR, 'static', name)
            self.assertTrue(os.path.isfile(path), name)


if __name__ == '__main__':
    unittest.main()
