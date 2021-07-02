# etc_jupyterlab_authoring

[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/educational-technology-collective/etc_jupyterlab_authoring/main?urlpath=lab)

A JupyterLab authoring extension.

## Requirements

* JupyterLab >= 3.0

## Install

To install the extension:

Install the Python build package (https://pypi.org/project/build/).

```bash
pip install build
```

Clone to repository.

```bash
git clone https://github.com/educational-technology-collective/etc_jupyterlab_authoring.git
```

or,

```bash
git clone git@github.com:educational-technology-collective/etc_jupyterlab_authoring.git
```

Change the directory into the repository.

```bash
cd etc_jupyterlab_authoring
```

**The following instructions assume that your current working directory is the base directory of the repository.**

Next build the extension according to the instructions given in the [documentation](https://jupyterlab.readthedocs.io/en/stable/extension/extension_tutorial.html#packaging-your-extension).  The instructions are summarized below:

Create a wheel (.whl) package in the `dist` directory.

```bash
python -m build
```

Install the wheel package; this will install the extension.

```bash
pip install ./dist/etc_jupyterlab_authoring-*-py3-none-any.whl
```

Start Jupyter Lab.

```bash
jupyter lab
```
## Uninstall

To remove the extension, execute:

```bash
pip uninstall etc_jupyterlab_authoring
```


## Troubleshoot

If you are seeing the frontend extension, but it is not working, check
that the server extension is enabled:

```bash
jupyter server extension list
```

If the server extension is installed and enabled, but you are not seeing
the frontend extension, check the frontend extension is installed:

```bash
jupyter labextension list
```


## Contributing

### Development install

Note: You will need NodeJS to build the extension package.

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) that is installed with JupyterLab. You may use
`yarn` or `npm` in lieu of `jlpm` below.

```bash
# Clone the repo to your local environment
# Change directory to the etc_jupyterlab_authoring directory
# Install package in development mode
pip install -e .
# Link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite
# Server extension must be manually installed in develop mode
jupyter server extension enable etc_jupyterlab_authoring
# Rebuild extension Typescript source after making changes
jlpm run build
```

You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in the extension's source and automatically rebuild the extension.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
jlpm run watch
# Run JupyterLab in another terminal
jupyter lab
```

With the watch command running, every saved change will immediately be built locally and available in your running JupyterLab. Refresh JupyterLab to load the change in your browser (you may need to wait several seconds for the extension to be rebuilt).

By default, the `jlpm run build` command generates the source maps for this extension to make it easier to debug using the browser dev tools. To also generate source maps for the JupyterLab core extensions, you can run the following command:

```bash
jupyter lab build --minimize=False
```

### Development uninstall

```bash
# Server extension must be manually disabled in develop mode
jupyter server extension disable etc_jupyterlab_authoring
pip uninstall etc_jupyterlab_authoring
```

In development mode, you will also need to remove the symlink created by `jupyter labextension develop`
command. To find its location, you can run `jupyter labextension list` to figure out where the `labextensions`
folder is located. Then you can remove the symlink named `@educational-technology-collective/etc_jupyterlab_authoring` within that folder.
