import * as cdk from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import type { Construct } from "constructs";

export interface MonthlyEndBusinessDayCheckStackProps {
	envType: string;
}

export class MonthlyEndBusinessDayCheckStack extends cdk.Stack {
	constructor(
		scope: Construct,
		id: string,
		props: MonthlyEndBusinessDayCheckStackProps,
	) {
		super(scope, id);
		const { envType } = props;

		const roleName = `MonthlyEndBusinessDayCheckRole-${envType}`;
		const lambdaName = `MonthlyEndBusinessDayCheckLambda-${envType}`;
		const logGroupName = `/aws/lambda/${lambdaName}`;
		const ruleName = `MonthlyEndBusinessDayCheckRule-${envType}`;
		const secretsName = `MonthlyEndBusinessDayCheckSecrets-${envType}`;

		// AWS Secrets ManagerにLINE Messaging API用の認証情報を格納
		const secrets = new secretsmanager.Secret(this, secretsName, {
			secretName: secretsName,
			description:
				"LINE Messaging API credentials and Google Calendar API credentials",
			generateSecretString: {
				secretStringTemplate: JSON.stringify({
					channelId: "YOUR_LINE_CHANNEL_ID",
					channelSecret: "YOUR_LINE_CHANNEL_SECRET",
					lineKid: "YOUR_LINE_KID",
					linePrivateKey: "YOUR_LINE_PRIVATE_KEY",
					calendarId: "YOUR_GOOGLE_CALENDAR_ID",
					calendarPrivateKey: "YOUR_GOOGLE_CALENDAR_PRIVATE_KEY",
					calendarClientEmail: "YOUR_GOOGLE_CALENDAR_CLIENT_EMAIL",
				}),
				generateStringKey: "password", // このフィールドは使用しないが、テンプレートには必要
			},
		});

		const logGroup = new logs.LogGroup(this, logGroupName, {
			logGroupName,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
			retention: logs.RetentionDays.ONE_MONTH,
		});

		const lambdaRole = new iam.Role(this, roleName, {
			assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
			roleName,
			inlinePolicies: {
				lambdaBasicExecutionRole: new iam.PolicyDocument({
					statements: [
						new iam.PolicyStatement({
							actions: [
								"logs:CreateLogGroup",
								"logs:CreateLogStream",
								"logs:PutLogEvents",
							],
							resources: [logGroup.logGroupArn],
							effect: iam.Effect.ALLOW,
						}),
					],
				}),
				secretsManagerAccess: new iam.PolicyDocument({
					statements: [
						new iam.PolicyStatement({
							actions: ["secretsmanager:GetSecretValue"],
							resources: [secrets.secretArn],
							effect: iam.Effect.ALLOW,
						}),
					],
				}),
			},
		});

		const monthlyEndBusinessDayCheckFunction = new lambda.NodejsFunction(
			this,
			"MonthlyEndBusinessDayCheckFunction",
			{
				entry: "src/monthlyEndBusinessDayCheck.ts",
				runtime: cdk.aws_lambda.Runtime.NODEJS_22_X,
				architecture: cdk.aws_lambda.Architecture.ARM_64,
				loggingFormat: cdk.aws_lambda.LoggingFormat.JSON,
				systemLogLevel: cdk.aws_lambda.SystemLogLevel.INFO,
				applicationLogLevelV2: cdk.aws_lambda.ApplicationLogLevel.INFO,
				environment: {
					NODE_ENV: envType,
					SECRETS_NAME: secrets.secretName,
				},
				timeout: cdk.Duration.seconds(30),
				logGroup,
				role: lambdaRole,
			},
		);

		// EventBridgeルールの作成
		const rule = new events.Rule(this, ruleName, {
			ruleName,
			schedule: events.Schedule.cron({
				minute: "0",
				hour: "9",
				day: "*",
				month: "*",
				year: "*",
			}),
			description: "毎日朝9時に月末営業日チェックLambdaを実行",
		});

		// Lambda関数をターゲットとして追加
		rule.addTarget(
			new targets.LambdaFunction(monthlyEndBusinessDayCheckFunction),
		);
	}
}
