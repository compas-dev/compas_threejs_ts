# Shared Conventional Commits rule.
#
# Sourced by the commit-msg hook in this directory and by the pr-checks
# workflow, so the local check and the CI check can never drift apart.

CONVENTIONAL_COMMIT_TYPES="build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test"
CONVENTIONAL_COMMIT_PATTERN="^(${CONVENTIONAL_COMMIT_TYPES})(\([a-z0-9._/-]+\))?!?: .+"

# Subjects that git or a tool generates. Release Please ignores them and so do
# we, because a contributor cannot reword them into a conventional subject.
CONVENTIONAL_COMMIT_EXEMPT_PATTERN='^(Merge |Revert "|fixup!|squash!|amend!)'

is_conventional_commit() {
  if [[ "$1" =~ $CONVENTIONAL_COMMIT_EXEMPT_PATTERN ]]; then
    return 0
  fi
  [[ "$1" =~ $CONVENTIONAL_COMMIT_PATTERN ]]
}
