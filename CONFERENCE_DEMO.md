# Conference Demo: Invariants in Claude Code

**Duration: 7 minutes**

---

## Overview

This demo shows how invariants detect and remediate the 3 types of untestable bugs Jennifer mentioned. 
- **Too hard to test** (race conditions)
- **Too expensive to test** (performance characteristics)
- **Too complex to test** (combinatorial state explosion)

Each invariant is presented as:
1. The Problem (what breaks in generated code)
2. The Invariant (the rule we define)
3. The Fix (before/after code showing the solution)

---

## Opening Statement (30 seconds)

> "Thanks Jennifer.  I am going to walk you through how it to add Invariants into your agent workflow to address the 3 types of issues Jennifer mentioned.  For this demo, I generated a simple shopping cart app using Claude Code with the Tessl Spec Registry to help Claude understand how to best use Mongoose. It is a NodeJS/Mongoose/Typescript application with an express API that allows users to search for items, add items to their cart, and checkout. Claude helpfully generated a full set of unit tests for us so there is 100% code coverage, but as we know there are at least 3 untestable bugs lurking in the code.  

For each bug, I will show you how to structure an invariant at the right scope and then a technique to enforce or verify the implementation.  There are absolutely different approaches to verify each invariant and my focus is on showing a variety of techniques to help showcase the power of the approach.  The best enforcement approach highly depends on your available time and the priority of the invariant. For example, Business critical invariants will require a higher level of verification whereas best-practices related invariants can be enforced at a lower level.   
"

---


**Presenter Note:** In the first scenario, Too Hard to Test, the two users are trying to buy the last item in stock simultaneously and based on how threads execute, we could end up double selling the item.  This is a typical race condition caused by the agent not applying any transactions boundaries or rollbacks.  This issue applies universally, across this project and any other project we may work on, so we want to ensure this is addressed in all of our projects.    Here's the sample code helpfully generated for us by Claude Code that shows the issue. 

<show the race condition briefly>

I placed this INVARIANT.md file in my claude home directory so it is available by default.  Let's take a look at how the invariant is defined and how to use it: 

<show the invariant file> 

The invariant is comprised of several parts.  A brief definition, details on when to apply it, why it is important, an example of the problem, what a solution looks like,  and most importantly, how to verify the invariant.  

In this example, we instruct the agent to leverage the provided MCP tool to check each method for its transaction safety and from there, the agent or the user can make the necessary changes to address any issues. For an invariant as critical as this, we want to ensure we are not relying on the non-deterministic nature of the agent to correctly determine when we need transactions.    

<show the claude code prompt>

Now let's look at how the agent is prompted to check for violations of the invariant. In a real-world scenario, this would happen in the flow of development or be tied into the CI/CD pipeline. Notice how it invokes the transaction-analyzer MCP tool to identify 3 violations, it also found 3 methods that are unaffected. It then created a plan to fix the issues based on the feedback from the tool. 

Let's move onto the second scenario- memory inefficient code, aka Too Expensive to Test. This is a common issue with agentic code generation where the code where the impact of the miss may not be felt till much later on in the software's lifecycle.  But by leveraging an invariant up front, we can ensure the agent generates code that is more efficient from the start. 

<show getItemById code>
In this example, let's look at how getItemByID is implemented.  Notice it exec's the query and then later calls toObject() to convert it to a JSON object.  This pattern is unfortunately too common and it results in memory overhead as the object maintains a lot of overhead that is not needed.  It is very easy for agents and developers to forget to use .lean() when they require the plain object.  

This is no at the same level of criticality as the transaction invariant.  It is more of a best practice, so let's create an invariant that will nudge the agent to do the right thing for all uses of Mongo in our project. 

<show the invariant file>

This invariant is structured the same way as the previous one. At the bottom, we provide clear instructions on how to check for this and what to do. 

<show claude code prompt>

Now let's see how the agent examined the code and found the violations through simple code review.  We then prompted to agent to add a new search method - getItemsBelowPrice, and note how this was generated with the correct use of .lean().

<show Iventory Manager.getItemsBelowPrice at the bottom of the file>


The final demo is The Too Complex To Test issue, aka combinatorial state explosion, aka where I'd venture 95% of the successful systems we have built end up at some point in their lifetimes. There are just too many different scenarios to cover in the unit tests, so we need to find a way to provide a backstop for the agent to ensure we catch the outcomes we need to cover.  This level of Invariant is scoped to the individual module rather than the entire project. 

<show Inventory Manager.getAvailableItems, at the top of the file>
Let's consider the simple sounding method getAvailableItems in Inventory Manager.  This is quite a naive implementation, that doesn't take into account time-based reservations, incoming stock, future orders, etc. We know those are coming and we know it will be hard to test all the scenarios. And being a shopping cart system, we absolutely have to get this inventory tracking right.   So let's make an invariant to ensure any updates or saves to the InventoryItem schema leave the data in a consistent state.  This won't eliminate needing to test (or ideally create invariants) for all the different scenarios, but it helps get us started.

<Show the Invariant>
This is similar to the first two examples.  It describes how to build pre-update and pre-save hooks to our Cart and InventoryItem schemas to check item validity.  This seems like a one-off requirement to implement as an invariant, but with this approach, it ensures any future models in this Module will comply with this Invariant. 

<Show Claude Code>

Look at how the agent examind the code and identified a violation in the methods that manipulate Inventory Items.  The agent then suggested the pre and post hooks to add and any future dev will be checked for compliance.  


And that is 3 different techniques- MCP, code review, and code generation, to implement Invariants into your agent workflow to address the 3 types of issues Jennifer mentioned. I also walked through how to create the invariants at the right scope- universal, project-wide, and module wide.  

I will now turn it over to Jennifer to wrap things up. 

