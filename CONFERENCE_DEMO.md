## Opening Statement (30 seconds)

> "Thanks Jennifer.  I am going to walk through how to add Invariants into your agent workflow to address the 3 types of issues she mentioned.  For this demo, I generated a simple shopping cart app using Claude Code.  Despite having 100% code coverage with unit tests, we know there untestable bugs lurking in the code.  

For each bug, I will show you how to structure an invariant at the right scope and then a technique to enforce or verify the implementation.  The best verification approach depends on a combination of your available time and the business criticality of the invariants. 

======== Scenario 1: Too Hard to Test =========

In the first scenario, Too Hard to Test, the two users are trying to buy the last item in stock simultaneously and based on how threads execute, we could end up double selling the item.  This is a typical race condition caused by the agent not applying any transactions boundaries or rollbacks.  This issue applies universally, across every project we may work on, so we want to ensure this is addressed at that scope.    

<show the race condition briefly in InventoryManager.reserveItems line 55>

I placed this INVARIANT.md file in my claude home directory so it is available by default.  Let's take a look at how the invariant is defined and how to use it: 

<show the invariant file> 

The invariant is comprised of several parts.  A brief definition, details on when to apply it, why it is important, an example of the problem, what a solution looks like,  and most importantly, how to verify the invariant.  

In this example, we instruct the agent to leverage the provided MCP tool to validate each method in the InventoryManagerfor its transaction safety and from there, the agent or the user can make the necessary changes to address any issues. For an invariant as critical as this, we want to ensure a high level of confidence we catch the issue. 

<show the claude code prompt>

Now let's look at how the agent is prompted to check for violations of the invariant.  Notice how it invokes the transaction-analyzer MCP tool to identify 3 violations, it also found 3 methods that are unaffected. It then created a plan to fix the issues based on the feedback from the tool. 

======== Scenario 2: Too Expensive to Test =========

Let's move onto the second scenario- memory inefficient code, aka Too Expensive to Test. This is a common issue with agentic code generation where the impact of the issue may not be felt till much later on in the software's lifecycle.  But by leveraging an invariant up front, we can ensure the agent generates code that is more efficient from the start. 

<show getItemById code at line 30>
In this example, let's look at how getItemByID is implemented.  Notice it exec's the query and then later calls toObject() to convert it to a JSON object.  This pattern is unfortunately too common and it results in memory overhead as the object maintains a lot of overhead that is not needed.  It is very easy for agents and developers to forget to use .lean() when they require the plain object.  

This is no at the same level of criticality as the transaction invariant.  It is more of a best practice, so let's create an invariant that will nudge the agent to do the right thing for all uses of Mongo in our project. 

<show the invariant file>

This invariant is structured the same way as the previous one. At the bottom, we provide clear instructions on how to check for this and what to do. 

<show claude code prompt>

Now let's see how the agent examined the code and found the violations through simple code review.  We then prompted to agent to add a new search method - getItemsBelowPrice, and note how this was generated with the correct use of .lean().

<show Iventory Manager.getItemsBelowPrice at the bottom of the file>

======== Scenario 3: Too Complex To Test =========


The final demo is The Too Complex To Test issue, aka combinatorial state explosion, aka when are just too many different scenarios to cover in the unit tests that some inevitably end up being missed.

<show IShoppingCart.addItems, at the top of the file>
Let's consider the method to add an item to the shopping cart. Even in our simple app, there are already two validations in place- it ensures te items exists and ensures there is sufficient quantity available. But there's already an issue-  it isn't checking the items reserved by other users.  This means when the cart is persisted, we could potentially end up with an invalid inventory state. I am sure there are other misses as well, but rather than try to fix them one by one, let's add an invariant that to the ShoppingCart module that ensures any updates or saves to inventory leaves the system in a consistent state. 

<Show the Invariant>
This is similar to the first two examples.  It describes how to build pre-update and pre-save hooks to our Cart and InventoryItem schemas to check item validity.  This seems like a one-off requirement to implement as an invariant, but with this approach, it ensures any future models in this Module will comply with this Invariant. 

<Show Claude Code>

Look at how the agent examind the code and identified a violation in the methods that manipulate Inventory Items.  The agent then suggested the pre and post hooks to add and any future dev will be checked for compliance.  


And that is 3 different techniques- MCP, code review, and code generation, to implement Invariants into your agent workflow to address the 3 types of issues Jennifer mentioned. I also walked through how to create the invariants at the right scope- universal, project-wide, and module wide.  

I will now turn it over to Jennifer to wrap things up. 

