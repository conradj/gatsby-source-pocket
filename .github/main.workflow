workflow "Publish to NPM" {
  on = "push"
  resolves = ["Publish"]
}

action "Publish" {
  uses = "actions/npm@master"
  secrets = ["NPM_AUTH_TOKEN"]
}
