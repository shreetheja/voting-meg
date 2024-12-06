//import "../css/style.css"

const Web3 = require('web3');
const contract = require('@truffle/contract');

const votingArtifacts = require('../../build/contracts/Voting.json');
var VotingContract = contract(votingArtifacts)


window.App = {
  eventStart: function () {
    window.ethereum.request({ method: 'eth_requestAccounts' });
    VotingContract.setProvider(window.ethereum)
    VotingContract.defaults({ from: window.ethereum.selectedAddress, gas: 6654755 })

    // Load account data
    App.account = window.ethereum.selectedAddress;
    console.log(App.account);
    $("#accountAddress").html("Your Account: " + window.ethereum.selectedAddress);
    VotingContract.deployed().then(function (instance) {
      instance.getCountCandidates().then(function (countCandidates) {

        $(document).ready(function () {
          $('#addCandidate').click(function () {
            var nameCandidate = $('#name').val();
            var partyCandidate = $('#party').val();
            var partySymbol = $('#symbol').val();
            partyCandidate = partySymbol + ":_:" + partyCandidate
            instance.addCandidate(nameCandidate, partyCandidate).then(function (result) { })
          });
          $('#addDate').click(function () {
            var startDate = Date.parse(document.getElementById("startDate").value) / 1000;

            var endDate = Date.parse(document.getElementById("endDate").value) / 1000;

            instance.setDates(startDate, endDate).then(function (rslt) {
              console.log("tarihler verildi");
            });

          });

          instance.getDates().then(function (result) {
            var startDate = new Date(result[0] * 1000);
            var endDate = new Date(result[1] * 1000);

            $("#dates").text(startDate.toDateString(("#DD#/#MM#/#YYYY#")) + " - " + endDate.toDateString("#DD#/#MM#/#YYYY#"));
          }).catch(function (err) {
            console.error("ERROR! " + err.message)
          });
        });

        for (var i = 0; i < countCandidates; i++) {
          instance.getCandidate(i + 1).then(function (data) {
            var id = data[0];
            var name = data[1];
            var party_name;
            var party_symbol;
            var partyArr = data[2].split(":_:",);
            if (partyArr.length == 1) {
              party_name = partyArr[0];
            } else if (partyArr.length == 2) {
              party_symbol = partyArr[1];
              party_name = partyArr[0];
            }
            var voteCount = data[3];
            var viewCandidates = `<tr><td> <input class="form-check-input" type="radio" name="candidate" value="${id}" id=${id}>` + name + "</td><td>" + party_name + "</td><td>" + party_symbol + "</td><td>" + voteCount + "</td></tr>"
            $("#boxCandidate").append(viewCandidates)
          })
        }

        window.countCandidates = countCandidates
      });

      instance.checkVote().then(function (voted) {
        console.log(voted);
        if (!voted) {
          $("#voteButton").attr("disabled", false);

        }
      });

    }).catch(function (err) {
      console.error("ERROR! " + err.message)
    })
  },

  vote: function () {
    // Validate wallet before proceeding
    App.validateWallet().then(function (isValid) {
      if (!isValid) {
        alert("Wallet connected and voterID do not match please")
        return;
      }

      var candidateID = $("input[name='candidate']:checked").val();
      console.log(candidateID);
      if (!candidateID) {
        $("#msg").html("<p>Please vote for a candidate.</p>");
        return;
      }
      console.log("Checking deployment ");
      VotingContract.deployed().then(function (instance) {
        console.log("Vote");
        instance.vote(parseInt(candidateID)).then(function (result) {
          $("#voteButton").attr("disabled", true);
          $("#msg").html("<p>Voted</p>");
          window.location.reload(1);
        });
      }).catch(function (err) {
        console.error("ERROR! " + err.message);
      });
    });
  },

  validateWallet: function () {
    // Get the connected wallet address
    const connectedWallet = App.account;

    // Fetch the voter's wallet address via API
    const voterID = prompt("Please enter your Voter ID for verification:");

    if (!voterID) {
      $("#msg").html("<p>Voter ID is required for validation.</p>");
      return false;
    }

    const url = `http://127.0.0.1:8000/validate-wallet?voter_id=${voterID}&connected_wallet=${connectedWallet}`;

    return $.ajax({
      url: url,
      type: 'GET',
      success: function (response) {
        if (response.valid) {
          console.log("Wallet validation successful.");
          return true;
        } else {
          $("#msg").html("<p>Wallet address does not match. Voting not allowed.</p>");
          return false;
        }
      },
      error: function (xhr, status, error) {
        console.error("Error in wallet validation: " + error);
        $("#msg").html("<p>Error validating wallet address. Please try again.</p>");
        return false;
      }
    });
  },

}

window.addEventListener("load", function () {
  if (typeof web3 !== "undefined") {
    console.warn("Using web3 detected from external source like Metamask")
    window.eth = new Web3(window.ethereum)
  } else {
    console.warn("No web3 detected. Falling back to http://localhost:9545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for deployment. More info here: http://truffleframework.com/tutorials/truffle-and-metamask")
    window.eth = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:9545"))
  }
  window.App.eventStart()
})
