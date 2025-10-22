# Project

# Tessl & Spec Driven Development <!-- tessl-managed -->

This project uses the [Tessl spec driven development framework](.tessl/framework/agents.md) and toolkit for software development: @.tessl/framework/agents.md

# Agent Rules <!-- tessl-managed -->

@RULES.md follow the [instructions](RULES.md)

# Knowledge Index <!-- tessl-managed -->

Documentation for dependencies and processes can be found in the [Knowledge Index](./KNOWLEDGE.md)

# Plan Files <!-- tessl-managed -->

ALWAYS create [plan files](.tessl/framework/plan-files.md) when planning: @.tessl/framework/plan-files.md

# Project Configuration

This project uses TypeScript as the primary programming language with Jest as the testing framework.

## Directory Structure

- **Specifications**: `./specs` - Contains spec files that define module requirements and test cases
- **Source Code**: `./src` - Contains implementation files
- **Tests**: `./test` - Contains test implementation files

## Development Commands

- **Run Tests**: `pnpm run test`

## Testing Framework

The project uses Jest for testing. Test files should be written to implement the test cases defined in the corresponding spec files.