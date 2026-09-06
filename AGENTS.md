# AGENTS.md

## Hub経由の作業に関する注意

このリポジトリは、司令塔リポジトリ`ai-project-hub`(https://github.com/syararinn/ai-project-hub)から`projects/News-RSS/`として横断的に扱われることがある。自宅PC・会社PCを同時に使わない運用のため、Hub経由でここへ来た場合でも、このフォルダを直接開いた場合でも、ローカルの内容がGitHubの最新版より遅れている可能性を常に前提にする。

作業を始める前に:

1. `git fetch --prune`を実行する。
2. 作業ツリーがクリーンで`origin`より遅れているだけなら`git pull --ff-only`する。
3. 未コミット変更がある、または`origin`と分岐している場合は、自動stash・自動merge・自動破棄をせず、利用者に確認する。

複数リポジトリを横断する同期ルールの詳細は、Hub側の`operations/GIT_SYNC_RULES.md`を参照する。
