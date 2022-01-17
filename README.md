# Master Mind


## Overview

REST API 対応マスターマインド


## How to play

- `GET /api/init`

  - ゲーム初期化＆ゲームid取得

- `GET /api/check?id=xxxx&value=yyyy`

  - ゲームid=xxxx に対して推測した yyyy の結果をチェック

- `GET /api/status?id=xxxx`

  - ゲームid=xxxx に対する過去回答履歴を含める状況確認

- `GET /api/giveup?id=xxxx`

  - ゲームid=xxxx に対してギブアップ宣言


## Licensing

This code is licensed under MIT.


## Copyright

2022  [K.Kimura @ Juge.Me](https://github.com/dotnsf) all rights reserved.
