pragma solidity ^0.4.10;

contract Reputon {
  string[] public reputons;
  mapping (string => address) reputonOwner;
  uint256 public reputonCount;

  function put(string _reputon) returns (bool _success) {
    if (reputonOwner[_reputon] > 0) return false;
    reputonOwner[_reputon] = msg.sender;
    reputons.push(_reputon);
    reputonCount++;
    return true;
  }

  function getSigner(string reputon) returns (address _signer) {
    return reputonOwner[reputon];
  }

  function getReputon(uint256 index) returns (string _reputon) {
    return reputons[index];
  }
}