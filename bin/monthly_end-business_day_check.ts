#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { MonthlyEndBusinessDayCheckStack } from "../lib/monthly_end-business_day_check-stack";

const app = new cdk.App();

// ──────────── 1) CLI の --context で渡された環境キーを取得 ────────────
//      例: cdk deploy --context environment=production
//      → rawEnvKey は "production"。指定しなければ cdk.json の "environment" 値 ("develop") が返る。
const rawEnvKey = app.node.tryGetContext("environment") as string | undefined;
if (!rawEnvKey) {
	throw new Error(
		'Context key "environment" is not defined. Please pass --context environment=<develop|production>',
	);
}

// ──────────── 2) 環境キーが "develop" or "production" のどちらかを検証 ────────────
const validEnvKeys = ["develop", "production"];
if (!validEnvKeys.includes(rawEnvKey)) {
	throw new Error(
		`Invalid environment: "${rawEnvKey}". Expected one of ${validEnvKeys.join(", ")}`,
	);
}
const envKey = rawEnvKey as "develop" | "production";

// ──────────── 3) 環境キーに対応するコンテキストオブジェクトを一括取得 ────────────
//      cdk.json の "context": { "develop": { … }, "production": { … } } を参照
const envConfig = app.node.tryGetContext(envKey) as {
	envType: string;
};
if (!envConfig) {
	throw new Error(`Context for "${envKey}" is not defined in cdk.json`);
}

// ──────────── 4) 取得した envConfig からサフィックスや各種設定を取り出す ────────────
const envType = envConfig.envType; // "dev" もしくは "prod"

new MonthlyEndBusinessDayCheckStack(
	app,
	`MonthlyEndBusinessDayCheckStack-${envType}`,
	{
		envType,
	},
);
