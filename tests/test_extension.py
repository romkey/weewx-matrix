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
            'shell-data.json.tmpl',
            'current.json.tmpl',
            'theme-init.inc',
            'theme-toggle.inc',
            'archive/month-%Y-%m.html.tmpl',
            'archive/year-%Y.html.tmpl',
        )
        for name in patterns:
            path = os.path.join(SKIN_DIR, name)
            with self.subTest(template=name):
                self.assertTrue(os.path.getsize(path) > 0, name)

    def test_static_assets_exist(self):
        for name in ('matrix.css', 'matrix.js', 'shell.js', 'favicon.svg'):
            path = os.path.join(SKIN_DIR, 'static', name)
            self.assertTrue(os.path.isfile(path), name)

    def test_new_templates_exist(self):
        for name in ('shell-data.json.tmpl', 'theme-init.inc', 'theme-toggle.inc', 'current.json.tmpl'):
            path = os.path.join(SKIN_DIR, name)
            self.assertTrue(os.path.isfile(path), name)

    def test_light_plot_stanzas_exist(self):
        conf = configobj.ConfigObj(
            os.path.join(SKIN_DIR, 'skin.conf'),
            encoding='utf-8',
            file_error=True,
        )
        plot_groups_raw = conf['DisplayOptions']['plot_groups']
        if isinstance(plot_groups_raw, list):
            plot_groups = plot_groups_raw
        else:
            plot_groups = [g.strip() for g in plot_groups_raw.split(',')]
        periods_raw = conf['DisplayOptions']['periods']
        if isinstance(periods_raw, list):
            periods = periods_raw
        else:
            periods = [p.strip() for p in periods_raw.split(',')]
        image_gen = conf['ImageGenerator']
        for period in periods:
            section = f'{period}_images'
            light_section = f'{period}_images_light'
            self.assertIn(section, image_gen, section)
            self.assertIn(light_section, image_gen, light_section)
            for group in plot_groups:
                plot = f'{period}{group}'
                self.assertIn(plot, image_gen[section], plot)
                self.assertIn(f'{plot}_light', image_gen[light_section], f'{plot}_light')

    def test_shell_options_in_extras(self):
        conf = configobj.ConfigObj(
            os.path.join(SKIN_DIR, 'skin.conf'),
            encoding='utf-8',
            file_error=True,
        )
        self.assertIn('enable_shell', conf['Extras'])
        self.assertIn('default_theme', conf['Extras'])
        self.assertIn('shell_history_days', conf['Extras'])
        with open(os.path.join(SKIN_DIR, 'skin.conf'), encoding='utf-8') as skin_conf:
            extras_text = skin_conf.read()
        self.assertIn('hardware_name', extras_text)
        self.assertIn('atproto', extras_text)
        self.assertEqual(conf['SKIN_VERSION'], '1.1.0')


if __name__ == '__main__':
    unittest.main()
