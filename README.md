# Phrasea Keycloak

Custom [Keycloak](https://www.keycloak.org/) image for
[Phrasea](https://github.com/alchemy-fr/phrasea), bundling:

- **`group-uuid-mapper`** — protocol mapper exposing group membership as UUIDs.
- **`jq-idp-mapper`** — identity-provider mapper extracting groups from IdP claims
  with jq expressions.
- **`phrasea` theme** — login, email, account, admin and welcome themes. The login
  CSS background and logo are templated at container startup from the
  `KC_LOGIN_CSS_BACKGROUND` and `KC_LOGIN_CSS_LOGO_BACKGROUND` env vars
  (see `entrypoint.sh`).

The image is built with `KC_DB=postgres` and health endpoints enabled, and is meant
to be started with `start --optimized`.

## Run

The image is published as `ps-keycloak` to the registry configured in CI:

```bash
docker run --rm <registry>/ps-keycloak:latest start --optimized
```

See the `keycloak` service in
[phrasea's docker-compose.yml](https://github.com/alchemy-fr/phrasea/blob/master/docker-compose.yml)
for the full runtime configuration (database, hostname, proxy headers, SMTP...).

## Build

```bash
docker build --target keycloak -t phrasea-keycloak .
```

The SPI jars are compiled by Maven in a builder stage; no local toolchain is needed.

## CI

Every push and pull request builds the Docker image. Pushes to `main` publish
`<ECR_REGISTRY>/ps-keycloak:latest` (plus the commit SHA). The Keycloak version
declared in `pom.xml` (which must match the `FROM` lines of the `Dockerfile`) is
also published as an image tag and, the first time it reaches `main`, becomes a
git tag and a GitHub release of the same name (e.g. `26.8.1`). Any manually pushed
git tag publishes the corresponding image tag (semver tags also publish the stripped
version). Publishing uses the `ECR_REGISTRY` repository variable and the
`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` repository secrets; pull requests only
build, without pushing.
