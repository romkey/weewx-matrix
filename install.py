"""Installer for the Matrix WeeWX skin.

    weectl extension install weewx-matrix.zip
    weectl extension install https://github.com/romkey/weewx-matrix/archive/refs/heads/main.zip
"""

import os

from weecfg.extension import ExtensionInstaller

# Keep in sync with skins/Matrix/skin.conf (SKIN_VERSION) and changelog.
VERSION = '1.2.1'
SKIN = 'Matrix'
EXTENSION_NAME = 'weewx-matrix'


def _skin_files():
    """Return every file under skins/Matrix/, relative to the extension root."""
    root = os.path.dirname(os.path.abspath(__file__))
    skin_root = os.path.join(root, 'skins', SKIN)
    if not os.path.isdir(skin_root):
        # WeeWX keeps a copy of install.py under bin/user/installer/. That
        # cached copy has no skins/ tree; listing or uninstalling the
        # extension must not require re-walking the source package.
        return []

    paths = []
    for dirpath, _dirnames, filenames in os.walk(skin_root):
        for name in sorted(filenames):
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, root)
            paths.append(rel.replace(os.sep, '/'))

    if not paths:
        raise RuntimeError(f'No skin files found under skins/{SKIN}/')
    return sorted(paths)


def loader():
    return MatrixInstaller()


class MatrixInstaller(ExtensionInstaller):
    def __init__(self):
        super().__init__(
            version=VERSION,
            name=EXTENSION_NAME,
            description=(
                'A WeeWX skin styled after The Matrix: phosphor-green terminal UI, '
                'digital rain, and a deep archive.'
            ),
            author='John Romkey',
            author_email='',
            text='Installs the Matrix report skin.',
            config={
                'StdReport': {
                    'MatrixReport': {
                        'skin': SKIN,
                        'enable': 'true',
                    },
                },
            },
            files=[
                ('skins/Matrix', _skin_files()),
            ],
        )
