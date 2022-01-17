# Master Mind


## Overview

REST API 対応マスターマインド


## Online Service

https://dotnsf-mastermind.herokuapp.com/


## How to play

- `GET /api/init`

  - ゲーム初期化＆ゲームid取得

- `GET /api/check?id=xxxx&value=yyyy`

  - ゲームid=xxxx に対して推測した yyyy の結果をチェック

    - 結果内の hit 数 = 位置も種類も推測と一致していた数
    - 結果内の error 数 = 位置は間違えているが、種類が一致していた数
    - 例： "1234" の推測に対して "1hit, 1error" だった
      - "1234" の４つの数のうち、１つは位置も含めて正解している。別の１つは位置は間違えているが使われている。
    - （４桁の場合であれば）"4hit, 0error" になれば正解とみなされる

- `GET /api/giveup?id=xxxx`

  - ゲームid=xxxx に対してギブアップ宣言

- `GET /api/status?id=xxxx`

  - ゲームid=xxxx に対する過去回答履歴を含める状況確認


## Licensing

This code is licensed under MIT.


## Copyright

2022  [K.Kimura @ Juge.Me](https://github.com/dotnsf) all rights reserved.
