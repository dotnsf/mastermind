# Master Mind


## Overview

REST API 対応マスターマインド


## Online Service

https://dotnsf.github.io/mastermind/


## How to run app

- `$ npm install`

- `$ node app`

    - 管理用パスワードを指定する場合は `$ ADMIN_PASSWORD=password node app`

    - CORS 許可オリジンを指定する場合は `$ CORS=https://dotnsf.github.io/aaa node app`


## How to play app

- `GET /api/init`

  - ゲーム初期化＆ゲームid取得

- `GET /api/guess?id=xxxx&value=yyyy`

  - ゲームid=xxxx に対して yyyy で推測した結果をチェック

    - 結果内の hit 数 = 位置も種類も推測と一致していた数
    - 結果内の error 数 = 位置は間違えているが、種類が一致していた数
    - 例： "1234" の推測に対して "1hit, 1error" だった
      - "1234" の４つの数のうち、１つは位置も含めて正解している。別の１つは位置は間違えているが使われている。
    - （４桁の場合であれば）"4hit, 0error" になれば正解とみなされる

- `GET /api/giveup?id=xxxx`

  - ゲームid=xxxx に対してギブアップ宣言

- `GET /api/status?id=xxxx`

  - ゲームid=xxxx に対する過去回答履歴を含める状況確認

- `GET /api/status?password=xxxx`

  - 起動時に指定したパスワードを再度指定して、全データの状況確認

- `GET /api/reset?password=xxxx`

  - 起動時に指定したパスワードを再度指定して、全データを強制リセットする


## Environment Values for app

- `CORS`

  - Exception URL for CORS acccess. Default is ''(No CORS allowed).

- `ADMIN_PASSWORD`

  - Password to reset all data(`POST /api/reset`). Default is ''(No reset allowed).

- `DB_URL` \*

  - URL of Cloudant, if you want to store your data.

- `DB_APIKEY` \*

  - API key of your IBM Cloudant, if you want to store data.

- `DB_NAME` \*

  - Name of your database, if you want to store data.

\* You need to set following all three values if you want to store data to IBM Cloudant DB.


## How to run solver

- `$ node solver/solver`


## Environment Values for solver

- `MASTERMIND_API_URL`

  - Base URL of app server. Default is `https://mastermind-restapi.herokuapp.com/`.

- `MASTERMIND_NAME`

  - Name of player. Default is `(solver)`.

- `MASTERMIND_LENGTH`

  - Length of digit. Default is `4`.

- `MASTERMIND_HIGHLOW`

  - HIGHLOW setting of game. Default is `1 (on)`.


## Licensing

This code is licensed under MIT.


## Copyright

2022  [K.Kimura @ Juge.Me](https://github.com/dotnsf) all rights reserved.
